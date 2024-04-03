const assert = require("assert");
const Scalar = require("@railgun-community/ffjavascript").Scalar;
const ZqField = require("@railgun-community/ffjavascript").ZqField;
const { unstringifyBigInts } = require("@railgun-community/ffjavascript").utils;

// const F = new ZqField(Scalar.fromString("0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001"));  // bls
const F = new ZqField(Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617")); // bn128

// Parameters are generated by a reference script https://extgit.iaik.tugraz.at/krypto/hadeshash/-/blob/master/code/generate_parameters_grain.sage
// Used like so: sage generate_parameters_grain.sage 1 0 254 2 8 56 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
const opt = unstringifyBigInts(require("./poseidon_constants_opt.json"));

// Using recommended parameters from whitepaper https://eprint.iacr.org/2019/458.pdf (table 2, table 8)
// Generated by https://extgit.iaik.tugraz.at/krypto/hadeshash/-/blob/master/code/calc_round_numbers.py
// And rounded up to nearest integer that divides by t
const N_ROUNDS_F = 8;
const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];

const pow5 = a => F.mul(a, F.square(F.square(a, a)));

function poseidon(inputs) {
    assert(inputs.length > 0);
    assert(inputs.length <= N_ROUNDS_P.length);

    const t = inputs.length + 1;
    const nRoundsF = N_ROUNDS_F;
    const nRoundsP = N_ROUNDS_P[t - 2];
    const C = opt.C[t-2];
    const S = opt.S[t-2];
    const M = opt.M[t-2];
    const P = opt.P[t-2];

    let state = [F.zero, ...inputs.map(a => F.e(a))];

    state = state.map((a, i) => F.add(a, C[i]));

    for (let r = 0; r < nRoundsF/2-1; r++) {
        state = state.map(a => pow5(a));
        state = state.map((a, i) => F.add(a, C[(r +1)* t +i]));
        state = state.map((_, i) =>
            state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero)
        );
    }
    state = state.map(a => pow5(a));
    state = state.map((a, i) => F.add(a, C[(nRoundsF/2-1 +1)* t +i]));
    state = state.map((_, i) =>
        state.reduce((acc, a, j) => F.add(acc, F.mul(P[j][i], a)), F.zero)
    );
    for (let r = 0; r < nRoundsP; r++) {
        state[0] = pow5(state[0]);
        state[0] = F.add(state[0], C[(nRoundsF/2 +1)*t + r]);


        const s0 = state.reduce((acc, a, j) => {
            return F.add(acc, F.mul(S[(t*2-1)*r+j], a));
        }, F.zero);
        for (let k=1; k<t; k++) {
            state[k] = F.add(state[k], F.mul(state[0], S[(t*2-1)*r+t+k-1]   ));
        }
        state[0] =s0;
    }
    for (let r = 0; r < nRoundsF/2-1; r++) {
        state = state.map(a => pow5(a));
        state = state.map((a, i) => F.add(a, C[ (nRoundsF/2 +1)*t + nRoundsP + r*t + i ]));
        state = state.map((_, i) =>
            state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero)
        );
    }
    state = state.map(a => pow5(a));
    state = state.map((_, i) =>
        state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero)
    );

    return F.normalize(state[0]);
}

module.exports = poseidon;



