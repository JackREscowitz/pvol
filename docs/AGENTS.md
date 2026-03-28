# PVOL: Polymarket Implied Volatility Index

> **YHack 2026 · Prediction Markets Track**

## Project Overview

PVOL extracts implied volatility from Polymarket's prediction markets for Bitcoin price levels and compares it against Deribit's DVOL index. The gap between retail prediction market participants and institutional options traders creates a novel volatility signal.

**Core Concept:** Polymarket's "Will Bitcoin touch $X this month?" markets are mathematically one-touch barrier options. By inverting the barrier option formula using YES share prices, we recover the implied volatility that the crowd expects.

**Key Formula:**
```
σ = |ln(H / S)| / ( √T · |Φ⁻¹(P / 2)| )
```

Where σ = implied volatility, H = strike price, S = spot price, T = time to expiry, P = touch probability (YES share price).

## Project Status

**Current State:** Early stage — specification complete, implementation pending.

The repository currently contains:
- `PRODUCT_SPEC.md` — Comprehensive product specification with math, design decisions, and limitations
- `README.md` — Brief project description
- `LICENSE` — MIT License
- Environment configuration on `data-sources` branch (conda-requirements.txt, flake.nix)

## Technology Stack

### Planned Architecture
- **Frontend:** React (dashboard with three views)
- **Backend:** FastAPI (serves PVOL and DVOL data)
- **Data Processing:** Python with pandas, numpy, sympy

### Development Environment
- **Environment Manager:** Nix (flake.nix) with micromamba
- **Package Management:** Conda (conda-requirements.txt)
- **Python Version:** Not explicitly pinned (uses conda-forge defaults)

### Python Dependencies
```
pandas          # Data manipulation
numpy           # Numerical computing
sympy           # Symbolic math (for formula verification)
jupyterlab      # Interactive development
jupytext        # Notebook version control
basedpyright    # Type checking
ruff            # Linting and formatting
```

### Data Sources
| Source | Endpoint | Purpose |
|--------|----------|---------|
| Polymarket Gamma API | `gamma-api.polymarket.com` | Event and market metadata |
| Polymarket CLOB API | `clob.polymarket.com/prices-history` | YES token price history |
| Deribit | DVOL index endpoint | Benchmark institutional IV |
| CoinGecko | `/api/v3/coins/bitcoin/history` | BTC spot price history |

## Development Setup

### Prerequisites
- Nix package manager with flakes enabled
- Git

### Setup Steps

1. **Clone and enter the repository:**
   ```bash
   git clone <repo-url>
   cd pvol
   ```

2. **Enter the Nix development shell:**
   ```bash
   nix develop
   ```
   This automatically creates and activates a micromamba environment with all dependencies.

3. **Verify installation:**
   ```bash
   python -c "import pandas, numpy, sympy; print('OK')"
   ```

### Branch Strategy
- `main` — Main project branch (documentation, specs)
- `data-sources` — Environment setup and data fetching experiments

## Code Style Guidelines

### Python
- **Type Checking:** basedpyright (strict mode recommended)
- **Linting/Formatting:** ruff
- **Notebook Workflow:** Use jupytext to pair `.ipynb` with `.py` files for version control

### Project Conventions
Based on `PRODUCT_SPEC.md`:

1. **Zero-drift approximation** — The formula assumes zero drift. This is a stated limitation, not a bug.

2. **Non-monotone handling** — When Polymarket prices a farther strike higher than a closer one, drop the offending rung and flag data quality issue. Do not interpolate.

3. **Probability-mass-weighted aggregation** — When computing the single PVOL index number, weight each strike's IV by its probability mass band (difference in touch probabilities).

4. **Time normalization** — Label all PVOL readings with days remaining to expiry. Surface warnings when fewer than 7 days remain (readings become noisy).

5. **Month boundary handling** — Always use the frontmost active contract (nearest end date). No cross-month blending for hackathon scope.

## Testing Strategy

**Current Status:** No tests implemented yet.

**Recommended Approach:**
1. Unit tests for the IV inversion formula with known inputs/outputs
2. Integration tests for data fetchers (mock API responses)
3. Data quality tests for non-monotone rung detection

## Project Structure (Planned)

```
pvol/
├── backend/           # FastAPI application
│   ├── api/           # Route handlers
│   ├── models/        # Pydantic models
│   └── services/      # PVOL calculation, data fetching
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   └── views/     # Smile, Index, Gap views
├── data/              # Data fetching and processing
│   └── fetchers/      # Polymarket, Deribit, CoinGecko clients
├── notebooks/         # Jupyter exploration
└── tests/
```

## Key Implementation Notes

### Polymarket Event Discovery
Monthly BTC events follow the slug pattern: `what-price-will-bitcoin-hit-in-{month}-{year}`

### Formula Implementation
```python
import numpy as np
from scipy.stats import norm

def implied_volatility(H: float, S: float, T: float, P: float) -> float:
    """
    Calculate implied volatility from touch probability.
    
    Args:
        H: Strike price (e.g., 85000)
        S: Current spot price
        T: Time to expiry in years
        P: Touch probability (YES share price, 0-1)
    
    Returns:
        Annualized implied volatility
    """
    return abs(np.log(H / S)) / (np.sqrt(T) * abs(norm.ppf(P / 2)))
```

### Data Quality Flags
- Non-monotone rungs (farther strike priced higher than closer)
- Readings within 7 days of expiry
- Missing or stale price data

## Limitations & Caveats

Documented in `PRODUCT_SPEC.md` Section 7:

1. **Zero-drift assumption** — Risk-neutral drift ignored (small for monthly horizons)
2. **Non-monotone outer rungs** — Some strike ladders have logical inconsistencies
3. **Coarse strike grid** — $5k spacing yields ~10 data points
4. **Intramonth time decay** — Readings noisy near expiry
5. **Unvalidated gap signal** — PVOL/DVOL spread not empirically backtested

## License

MIT License — See `LICENSE` file.

## Additional Resources

- `PRODUCT_SPEC.md` — Full product specification with math derivation, design decisions, and feature scope
- Polymarket Gamma API docs: https://gamma-api.polymarket.com
- Deribit API docs: https://docs.deribit.com
