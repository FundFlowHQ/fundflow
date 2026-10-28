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

    // Allow the pool creator to reclaim remaining funds after the deadline has passed
    pub fn withdraw_unclaimed(env: Env, caller: Address, pool_id: u64) {
        caller.require_auth();

        let mut pool: GrantPool = env
            .storage()
            .instance()
            .get(&DataKey::Pool(pool_id))
            .expect("Pool not found");

        assert_eq!(caller, pool.creator, "Only pool creator can withdraw");
        assert!(env.ledger().timestamp() >= pool.deadline, "Deadline not reached yet");
        assert!(pool.is_active, "Pool already closed");
        assert!(pool.remaining_amount > 0, "Nothing left to withdraw");

        let amount = pool.remaining_amount;

        // Transfer remaining tokens back to the creator
        let token_client = token::Client::new(&env, &pool.token);
        token_client.transfer(
            &env.current_contract_address(),
            &caller,
            &amount,
        );

        pool.remaining_amount = 0;
        pool.is_active = false;

        env.storage().instance().set(&DataKey::Pool(pool_id), &pool);

        env.events().publish((Symbol::new(&env, "withdrawn"),), pool_id);
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