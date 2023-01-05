#!/bin/sh

RFQ="6k3nypehfxd4tqCGRxNEZBMiT4xUPdQCkothLVz3JK6D"
RISK_ENGINE="76TdqS9cEb8tYKUWKMzXBMwgCtXJiYMcrHxmzrYthjUm"
SPOT_INSTRUMENT="6pyiZyPDi7a6vMymw5NFTvtFBZJbDrNsgrcYK5jGEH4K"
PSYOPTIONS_EUROPEAN_INSTRUMENT="7ZD9LcvMPfurRYz2AuZPWgtSXuSxPmvZNMBFK7fhyvQA"

solana-test-validator --bpf-program ${RFQ} programs/rfq.so \
    --bpf-program ${SPOT_INSTRUMENT} programs/spot_instrument.so \
    --bpf-program ${PSYOPTIONS_EUROPEAN_INSTRUMENT} programs/psyoptions_european_instrument.so \
    --bpf-program ${RISK_ENGINE} programs/risk_engine.so \
    --reset
