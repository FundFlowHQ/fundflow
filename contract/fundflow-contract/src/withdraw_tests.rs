use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::testutils::Ledger as _;
use soroban_sdk::token::Client as TokenClient;
use soroban_sdk::token::StellarAssetClient;
use soroban_sdk::IntoVal;

// ---- helpers (same as in the main test module) ----

fn deploy_contract(env: &Env) -> FundFlowContractClient<'_> {
    let addr = env.register(FundFlowContract, ());
    FundFlowContractClient::new(env, &addr)
}

fn create_mock_token<'a>(env: &'a Env, admin: &Address) -> (TokenClient<'a>, Address) {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = sac.address();
    let admin_client = StellarAssetClient::new(env, &addr);
    admin_client.mint(admin, &10_000_000_000_000_i128);
    (TokenClient::new(env, &addr), addr)
}

/// Creates a pool of 1_000_000_000 with a deadline of 1_000_000_000.
fn create_pool_with_defaults(
    client: &FundFlowContractClient,
    env: &Env,
    creator: &Address,
    token_addr: &Address,
) -> u64 {
    let pool_name: String = "Test Pool".into_val(env);
    let pool_desc: String = "A test pool".into_val(env);

    client.create_pool(
        creator,
        &pool_name,
        &pool_desc,
        token_addr,
        &1_000_000_000_i128,
        &1_000_000_000_u64,
    )
}

// ---- withdraw_unclaimed tests ----

#[test]
fn test_withdraw_unclaimed_returns_funds_after_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    let (token, token_addr) = create_mock_token(&env, &creator);

    let balance_before = token.balance(&creator);
    let pool_id = create_pool_with_defaults(&client, &env, &creator, &token_addr);
    assert_eq!(token.balance(&creator), balance_before - 1_000_000_000);

    env.ledger().set_timestamp(1_000_000_001);
    client.withdraw_unclaimed(&creator, &pool_id);

    assert_eq!(token.balance(&creator), balance_before);
    let pool = client.get_pool(&pool_id);
    assert_eq!(pool.remaining_amount, 0);
    assert!(!pool.is_active);
}

#[test]
fn test_withdraw_unclaimed_works_exactly_at_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    let (token, token_addr) = create_mock_token(&env, &creator);

    let balance_before = token.balance(&creator);
    let pool_id = create_pool_with_defaults(&client, &env, &creator, &token_addr);

    env.ledger().set_timestamp(1_000_000_000);
    client.withdraw_unclaimed(&creator, &pool_id);

    assert_eq!(token.balance(&creator), balance_before);
}

#[test]
fn test_withdraw_unclaimed_returns_only_remaining_after_distribution() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    let applicant = Address::generate(&env);
    let (token, token_addr) = create_mock_token(&env, &creator);

    let balance_before = token.balance(&creator);
    let pool_id = create_pool_with_defaults(&client, &env, &creator, &token_addr);

    let proposal: String = "Fund me".into_val(&env);
    let app_id = client.apply(&pool_id, &applicant, &proposal, &100_000_000_i128);
    client.distribute(&creator, &app_id);

    env.ledger().set_timestamp(1_000_000_001);
    client.withdraw_unclaimed(&creator, &pool_id);

    // The applicant keeps what they were paid; the creator gets back the rest.
    assert_eq!(token.balance(&applicant), 100_000_000);
    assert_eq!(token.balance(&creator), balance_before - 100_000_000);
    assert_eq!(client.get_pool(&pool_id).remaining_amount, 0);
}

#[test]
#[should_panic(expected = "Deadline not reached yet")]
fn test_withdraw_unclaimed_rejects_before_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    let (_token, token_addr) = create_mock_token(&env, &creator);

    let pool_id = create_pool_with_defaults(&client, &env, &creator, &token_addr);
    client.withdraw_unclaimed(&creator, &pool_id);
}

#[test]
#[should_panic(expected = "Only pool creator can withdraw")]
fn test_withdraw_unclaimed_rejects_non_creator() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    let other = Address::generate(&env);
    let (_token, token_addr) = create_mock_token(&env, &creator);

    let pool_id = create_pool_with_defaults(&client, &env, &creator, &token_addr);
    env.ledger().set_timestamp(1_000_000_001);
    client.withdraw_unclaimed(&other, &pool_id);
}

#[test]
#[should_panic(expected = "Pool already closed")]
fn test_withdraw_unclaimed_rejects_second_withdraw() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    let (_token, token_addr) = create_mock_token(&env, &creator);

    let pool_id = create_pool_with_defaults(&client, &env, &creator, &token_addr);
    env.ledger().set_timestamp(1_000_000_001);
    client.withdraw_unclaimed(&creator, &pool_id);
    client.withdraw_unclaimed(&creator, &pool_id);
}

#[test]
#[should_panic(expected = "Nothing left to withdraw")]
fn test_withdraw_unclaimed_rejects_when_fully_distributed() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    let applicant_a = Address::generate(&env);
    let applicant_b = Address::generate(&env);
    let (_token, token_addr) = create_mock_token(&env, &creator);

    let pool_id = create_pool_with_defaults(&client, &env, &creator, &token_addr);

    let proposal: String = "Half each".into_val(&env);
    let app_a = client.apply(&pool_id, &applicant_a, &proposal, &500_000_000_i128);
    let app_b = client.apply(&pool_id, &applicant_b, &proposal, &500_000_000_i128);
    client.distribute(&creator, &app_a);
    client.distribute(&creator, &app_b);

    env.ledger().set_timestamp(1_000_000_001);
    client.withdraw_unclaimed(&creator, &pool_id);
}

#[test]
#[should_panic(expected = "Pool not found")]
fn test_withdraw_unclaimed_rejects_nonexistent_pool() {
    let env = Env::default();
    env.mock_all_auths();

    let client = deploy_contract(&env);
    let creator = Address::generate(&env);
    client.withdraw_unclaimed(&creator, &99_u64);
}