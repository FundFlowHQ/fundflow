#![no_std]
use soroban_sdk::{
   contract, contractimpl, contracttype, token,
    Address, Env, String, Symbol, Vec,
};

// Data structures
#[contracttype]
#[derive(Clone)]
pub struct GrantPool {
    pub id: u64,
    pub creator: Address,
    pub name: String,
    pub description: String,
    pub total_amount: i128,
    pub remaining_amount: i128,
    pub token: Address,
    pub deadline: u64,
    pub is_active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Application {
    pub id: u64,
    pub pool_id: u64,
    pub applicant: Address,
    pub proposal: String,
    pub votes: u64,
    pub is_approved: bool,
    pub amount_requested: i128,
}

#[contracttype]
pub enum DataKey {
    PoolCount,
    AppCount,
    Pool(u64),
    Application(u64),
    PoolApplications(u64),
    HasVoted(u64, Address),
}

#[contract]
pub struct FundFlowContract;

#[contractimpl]
impl FundFlowContract {

    // Create a new grant pool
    pub fn create_pool(
        env: Env,
        creator: Address,
        name: String,
        description: String,
        token: Address,
        amount: i128,
        deadline: u64,
    ) -> u64 {
        creator.require_auth();

        // Transfer tokens from creator to contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&creator, &env.current_contract_address(), &amount);

        let count: u64 = env.storage().instance().get(&DataKey::PoolCount).unwrap_or(0);
        let pool_id = count + 1;

        let pool = GrantPool {
            id: pool_id,
            creator,
            name,
            description,
            total_amount: amount,
            remaining_amount: amount,
            token,
            deadline,
            is_active: true,
        };

        env.storage().instance().set(&DataKey::Pool(pool_id), &pool);
        env.storage().instance().set(&DataKey::PoolCount, &pool_id);
        env.storage().instance().set(&DataKey::PoolApplications(pool_id), &Vec::<u64>::new(&env));

        env.events().publish((Symbol::new(&env, "pool_created"),), pool_id);

        pool_id
    }

    // Apply for a grant
    pub fn apply(
        env: Env,
        pool_id: u64,
        applicant: Address,
        proposal: String,
        amount_requested: i128,
    ) -> u64 {
        applicant.require_auth();

        let pool: GrantPool = env
            .storage()
            .instance()
            .get(&DataKey::Pool(pool_id))
            .expect("Pool not found");

        assert!(pool.is_active, "Pool is not active");
        assert!(env.ledger().timestamp() < pool.deadline, "Deadline passed");
        assert!(amount_requested <= pool.remaining_amount, "Amount exceeds pool balance");

        let count: u64 = env.storage().instance().get(&DataKey::AppCount).unwrap_or(0);
        let app_id = count + 1;

        let application = Application {
            id: app_id,
            pool_id,
            applicant,
            proposal,
            votes: 0,
            is_approved: false,
            amount_requested,
        };

        let mut apps: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::PoolApplications(pool_id))
            .unwrap_or(Vec::new(&env));

        apps.push_back(app_id);

        env.storage().instance().set(&DataKey::Application(app_id), &application);
        env.storage().instance().set(&DataKey::AppCount, &app_id);
        env.storage().instance().set(&DataKey::PoolApplications(pool_id), &apps);

        env.events().publish((Symbol::new(&env, "applied"),), app_id);

        app_id
    }

    // Vote on an application
    pub fn vote(env: Env, voter: Address, app_id: u64) {
        voter.require_auth();

        let voted_key = DataKey::HasVoted(app_id, voter.clone());
        let has_voted: bool = env.storage().instance().get(&voted_key).unwrap_or(false);
        assert!(!has_voted, "Already voted");

        let mut app: Application = env
            .storage()
            .instance()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        app.votes += 1;

        env.storage().instance().set(&DataKey::Application(app_id), &app);
        env.storage().instance().set(&voted_key, &true);

        env.events().publish((Symbol::new(&env, "voted"),), app_id);
    }

    // Approve and distribute funds to an applicant
    pub fn distribute(env: Env, caller: Address, app_id: u64) {
        caller.require_auth();

        let mut app: Application = env
            .storage()
            .instance()
            .get(&DataKey::Application(app_id))
            .expect("Application not found");

        let mut pool: GrantPool = env
            .storage()
            .instance()
            .get(&DataKey::Pool(app.pool_id))
            .expect("Pool not found");

        assert_eq!(caller, pool.creator, "Only pool creator can distribute");
        assert!(!app.is_approved, "Already distributed");
        assert!(app.amount_requested <= pool.remaining_amount, "Insufficient funds");

        // Transfer tokens to applicant
        let token_client = token::Client::new(&env, &pool.token);
        token_client.transfer(
            &env.current_contract_address(),
            &app.applicant,
            &app.amount_requested,
        );

        app.is_approved = true;
        pool.remaining_amount -= app.amount_requested;

        env.storage().instance().set(&DataKey::Application(app_id), &app);
        env.storage().instance().set(&DataKey::Pool(pool.id), &pool);

        env.events().publish((Symbol::new(&env, "distributed"),), app_id);
    }

    // Read functions
    pub fn get_pool(env: Env, pool_id: u64) -> GrantPool {
        env.storage()
            .instance()
            .get(&DataKey::Pool(pool_id))
            .expect("Pool not found")
    }

    pub fn get_application(env: Env, app_id: u64) -> Application {
        env.storage()
            .instance()
            .get(&DataKey::Application(app_id))
            .expect("Application not found")
    }

    pub fn get_pool_applications(env: Env, pool_id: u64) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::PoolApplications(pool_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn pool_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::PoolCount).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, AuthAs, Events};
    use soroban_sdk::{symbol_short, IntoVal, Val};

    // ── helpers ────────────────────────────────────────────────────────

    /// Create a mock Stellar Asset Contract and return (token_client, admin_client, token_address).
    fn create_mock_token<'a>(
        env: &'a Env,
        admin: &Address,
    ) -> (token::Client<'a>, token::StellarAssetClient<'a>, Address) {
        let sac = env.register_stellar_asset_contract_v2(admin.clone());
        let addr = sac.address();
        (
            token::Client::new(env, &addr),
            token::StellarAssetClient::new(env, &addr),
            addr,
        )
    }

    fn create_pool_with_defaults(
        env: &Env,
        creator: &Address,
        token_addr: &Address,
    ) -> u64 {
        let pool_name: String = "Test Pool".into_val(env);
        let pool_desc: String = "A test pool".into_val(env);

        FundFlowContract::create_pool(
            env.clone(),
            creator.clone(),
            pool_name,
            pool_desc,
            token_addr.clone(),
            1_000_000_000, // 100 XLM
            1_000_000_000, // far-future deadline
        )
    }

    // ── create_pool tests ──────────────────────────────────────────────

    #[test]
    fn test_create_pool_returns_incrementing_id() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let id1 = create_pool_with_defaults(&env, &creator, &token_addr);
        assert_eq!(id1, 1);

        let id2 = create_pool_with_defaults(&env, &creator, &token_addr);
        assert_eq!(id2, 2);

        let count = FundFlowContract::pool_count(env);
        assert_eq!(count, 2);
    }

    #[test]
    fn test_create_pool_stores_correct_data() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let name: String = "Stellar Dev Fund".into_val(&env);
        let desc: String = "For open-source devs".into_val(&env);

        let id = FundFlowContract::create_pool(
            env.clone(),
            creator.clone(),
            name.clone(),
            desc.clone(),
            token_addr.clone(),
            500_000_000,
            999_999_999,
        );

        let pool = FundFlowContract::get_pool(env, id);
        assert_eq!(pool.id, 1);
        assert_eq!(pool.creator, creator);
        assert_eq!(pool.name, name);
        assert_eq!(pool.description, desc);
        assert_eq!(pool.total_amount, 500_000_000);
        assert_eq!(pool.remaining_amount, 500_000_000);
        assert_eq!(pool.token, token_addr);
        assert_eq!(pool.deadline, 999_999_999);
        assert!(pool.is_active);
    }

    #[test]
    fn test_create_pool_emits_event() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let id = create_pool_with_defaults(&env, &creator, &token_addr);
        assert_eq!(id, 1);

        let events = env.events().all();
        // Should have exactly 1 event (pool_created)
        assert_eq!(events.len(), 1);
    }

    // ── apply tests ────────────────────────────────────────────────────

    #[test]
    fn test_apply_creates_application() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "Build a token bridge".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant.clone(),
            proposal.clone(),
            100_000_000,
        );

        assert_eq!(app_id, 1);

        let app = FundFlowContract::get_application(env, app_id);
        assert_eq!(app.pool_id, pool_id);
        assert_eq!(app.applicant, applicant);
        assert_eq!(app.proposal, proposal);
        assert_eq!(app.votes, 0);
        assert!(!app.is_approved);
        assert_eq!(app.amount_requested, 100_000_000);
    }

    #[test]
    fn test_apply_adds_to_pool_applications() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "Proposal 1".into_val(&env);
        let app_id1 = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant.clone(),
            proposal,
            50_000_000,
        );

        let proposal2: String = "Proposal 2".into_val(&env);
        let app_id2 = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal2,
            50_000_000,
        );

        let app_ids = FundFlowContract::get_pool_applications(env, pool_id);
        assert_eq!(app_ids.len(), 2);
        assert_eq!(app_ids.get(0), app_id1);
        assert_eq!(app_ids.get(1), app_id2);
    }

    #[test]
    #[should_panic(expected = "Amount exceeds pool balance")]
    fn test_apply_rejects_amount_exceeding_pool() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "Greedy proposal".into_val(&env);
        FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal,
            2_000_000_000, // 200 XLM — more than pool's 100 XLM
        );
    }

    #[test]
    #[should_panic(expected = "Pool not found")]
    fn test_apply_rejects_nonexistent_pool() {
        let env = Env::default();
        env.mock_all_auths();

        let applicant = Address::generate(&env);

        let proposal: String = "No pool exists".into_val(&env);
        FundFlowContract::apply(
            env.clone(),
            999,
            applicant,
            proposal,
            100_000_000,
        );
    }

    // ── vote tests ─────────────────────────────────────────────────────

    #[test]
    fn test_vote_increments_count() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "A proposal".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal,
            50_000_000,
        );

        let voter = Address::generate(&env);
        FundFlowContract::vote(env.clone(), voter, app_id);

        let app = FundFlowContract::get_application(env, app_id);
        assert_eq!(app.votes, 1);
    }

    #[test]
    fn test_vote_multiple_voters() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "A proposal".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal,
            50_000_000,
        );

        let voter1 = Address::generate(&env);
        let voter2 = Address::generate(&env);
        let voter3 = Address::generate(&env);

        FundFlowContract::vote(env.clone(), voter1, app_id);
        FundFlowContract::vote(env.clone(), voter2, app_id);
        FundFlowContract::vote(env.clone(), voter3, app_id);

        let app = FundFlowContract::get_application(env, app_id);
        assert_eq!(app.votes, 3);
    }

    #[test]
    #[should_panic(expected = "Already voted")]
    fn test_vote_prevents_double_vote() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "A proposal".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal,
            50_000_000,
        );

        let voter = Address::generate(&env);
        FundFlowContract::vote(env.clone(), voter.clone(), app_id);

        // Second vote from same voter should panic
        FundFlowContract::vote(env.clone(), voter, app_id);
    }

    #[test]
    #[should_panic(expected = "Application not found")]
    fn test_vote_rejects_nonexistent_application() {
        let env = Env::default();
        env.mock_all_auths();

        let voter = Address::generate(&env);
        FundFlowContract::vote(env.clone(), voter, 999);
    }

    // ── distribute tests ───────────────────────────────────────────────

    #[test]
    fn test_distribute_approves_and_transfers() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "Fund me".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal,
            100_000_000,
        );

        FundFlowContract::distribute(env.clone(), creator.clone(), app_id);

        let app = FundFlowContract::get_application(env.clone(), app_id);
        assert!(app.is_approved);

        let pool = FundFlowContract::get_pool(env.clone(), pool_id);
        assert_eq!(pool.remaining_amount, 900_000_000);
    }

    #[test]
    #[should_panic(expected = "Only pool creator can distribute")]
    fn test_distribute_rejects_non_creator() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "Fund me".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal,
            100_000_000,
        );

        let random_caller = Address::generate(&env);
        FundFlowContract::distribute(env.clone(), random_caller, app_id);
    }

    #[test]
    #[should_panic(expected = "Already distributed")]
    fn test_distribute_rejects_double_distribute() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "Fund me".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal,
            100_000_000,
        );

        FundFlowContract::distribute(env.clone(), creator.clone(), app_id);
        FundFlowContract::distribute(env.clone(), creator, app_id);
    }

    #[test]
    #[should_panic(expected = "Insufficient funds")]
    fn test_distribute_rejects_insufficient_funds() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal1: String = "Proposal 1".into_val(&env);
        let app_id1 = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant.clone(),
            proposal1,
            600_000_000,
        );

        let proposal2: String = "Proposal 2".into_val(&env);
        let app_id2 = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant,
            proposal2,
            600_000_000,
        );

        FundFlowContract::distribute(env.clone(), creator.clone(), app_id1);
        FundFlowContract::distribute(env.clone(), creator, app_id2);
    }

    // ── getter tests ───────────────────────────────────────────────────

    #[test]
    fn test_pool_count_starts_at_zero() {
        let env = Env::default();
        assert_eq!(FundFlowContract::pool_count(env), 0);
    }

    #[test]
    fn test_get_pool_applications_starts_empty() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);
        let apps = FundFlowContract::get_pool_applications(env, pool_id);
        assert_eq!(apps.len(), 0);
    }

    #[test]
    fn test_get_application_by_id() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);

        let proposal: String = "Detailed proposal".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant.clone(),
            proposal.clone(),
            75_000_000,
        );

        let fetched = FundFlowContract::get_application(env, app_id);
        assert_eq!(fetched.id, app_id);
        assert_eq!(fetched.applicant, applicant);
        assert_eq!(fetched.proposal, proposal);
        assert_eq!(fetched.amount_requested, 75_000_000);
    }

    // ── integration test ───────────────────────────────────────────────

    #[test]
    fn test_full_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();

        let creator = Address::generate(&env);
        let applicant = Address::generate(&env);
        let (_token_client, _admin, token_addr) = create_mock_token(&env, &creator);

        // 1. Create pool
        let pool_id = create_pool_with_defaults(&env, &creator, &token_addr);
        let pool = FundFlowContract::get_pool(env.clone(), pool_id);
        assert_eq!(pool.remaining_amount, 1_000_000_000);

        // 2. Applicant applies
        let proposal: String = "Build Soroban SDK docs".into_val(&env);
        let app_id = FundFlowContract::apply(
            env.clone(),
            pool_id,
            applicant.clone(),
            proposal,
            200_000_000,
        );

        // 3. Multiple voters vote
        let v1 = Address::generate(&env);
        let v2 = Address::generate(&env);
        let v3 = Address::generate(&env);
        FundFlowContract::vote(env.clone(), v1, app_id);
        FundFlowContract::vote(env.clone(), v2, app_id);
        FundFlowContract::vote(env.clone(), v3, app_id);

        let app = FundFlowContract::get_application(env.clone(), app_id);
        assert_eq!(app.votes, 3);

        // 4. Creator distributes
        FundFlowContract::distribute(env.clone(), creator, app_id);

        let app = FundFlowContract::get_application(env.clone(), app_id);
        assert!(app.is_approved);

        let pool = FundFlowContract::get_pool(env.clone(), pool_id);
        assert_eq!(pool.remaining_amount, 800_000_000);
        assert!(pool.is_active);

        // 5. Verify pool applications list
        let apps = FundFlowContract::get_pool_applications(env, pool_id);
        assert_eq!(apps.len(), 1);
        assert_eq!(apps.get(0), app_id);
    }
}
