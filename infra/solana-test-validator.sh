#!/bin/sh

RFQ="6k3nypehfxd4tqCGRxNEZBMiT4xUPdQCkothLVz3JK6D"
RISK_ENGINE="76TdqS9cEb8tYKUWKMzXBMwgCtXJiYMcrHxmzrYthjUm"
SPOT_INSTRUMENT="6pyiZyPDi7a6vMymw5NFTvtFBZJbDrNsgrcYK5jGEH4K"
PSYOPTIONS_EUROPEAN_INSTRUMENT="7ZD9LcvMPfurRYz2AuZPWgtSXuSxPmvZNMBFK7fhyvQA"
PSYOPTIONS_AMERICAN_INSTRUMENT="ATtEpDQ6smvJnMSJvhLc21DBCTBKutih7KBf9Qd5b8xy"
SWITCHBOARD_BTC_ORACLE="8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee"
SWITCHBOARD_SOL_ORACLE="GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR"
PSYOPTIONS_EURO_PRIMITIVE="FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs"
PSEUDO_PYTH_ORACLE="FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"

solana-test-validator --bpf-program ${RFQ} programs/rfq.so \
    --bpf-program ${SPOT_INSTRUMENT} programs/spot_instrument.so \
    --bpf-program ${PSYOPTIONS_EUROPEAN_INSTRUMENT} programs/psyoptions_european_instrument.so \
    --bpf-program ${PSYOPTIONS_AMERICAN_INSTRUMENT} programs/psyoptions_american_instrument.so \
    --bpf-program ${RISK_ENGINE} programs/risk_engine.so \
    --bpf-program ${SWITCHBOARD_BTC_ORACLE} programs/btc_20000_oracle_switchboard.json \
    --bpf-program ${SWITCHBOARD_SOL_ORACLE} programs/sol_30_oracle_switchboard.json \
    --bpf-program ${PSYOPTIONS_EURO_PRIMITIVE} programs/euro_primitive.so \
    --bpf-program ${PSEUDO_PYTH_ORACLE} programs/pseudo_pyth.so \
    --quiet \
    --reset