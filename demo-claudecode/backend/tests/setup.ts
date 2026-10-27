import { setScryptParamsForTests } from "../src/utils/password";

// Keeps the suite fast: production hashes use N=2^17 (~0.3 s each). Tests that check the real defaults reset this.
setScryptParamsForTests({ N: 2 ** 12, r: 8, p: 1 });
