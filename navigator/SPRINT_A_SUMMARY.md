# Sprint A Summary: Robust Fusion + Weight Handling

## ✅ Completed Implementation

### 1. Request Models (Extended)
- **Weights class**: `visual`, `spatial`, `attr` fields with proper defaults
- **SearchOpts class**: Unified options including weights, filters, mode
- **SearchById**: Updated to use new weight system
- **SearchByVector**: Maintained for backward compatibility

### 2. Weight Normalization Function
```python
def renorm_weights(wv: float, ws: float, wa: float, has_spatial: bool) -> np.ndarray:
    """Normalize weights, zeroing missing signals and re-normalizing to sum to 1."""
    w = np.array([wv, ws if has_spatial else 0.0, wa], dtype="float32")
    w = np.maximum(w, 0)  # Ensure non-negative
    s = w.sum()
    return (w / s) if s > 0 else np.array([1, 0, 0], dtype="float32")
```

**Key Features:**
- Zeros out spatial weight when `has_spatial=False`
- Re-normalizes remaining weights to sum to 1
- Falls back to visual-only (1,0,0) when all weights are zero
- Handles edge cases gracefully

### 3. Distance Normalization
- **Visual (Dv)**: Min-max normalization on FAISS distances per query
- **Spatial (Ds)**: Euclidean distance on normalized 4-D features (already normalized in FaissStore)
- **Attribute (Da)**: 0-1 distance based on filter mismatches

### 4. Robust Fusion Logic
```python
# Fuse score (lower is better)
w_eff = renorm_weights(w.visual, w.spatial, w.attr, has_spatial=query_has_spatial)
score = w_eff[0]*Dv[j] + w_eff[1]*Ds_j + w_eff[2]*Da_j
```

**Graceful Degradation:**
- When spatial features missing: `weights_effective.spatial == 0`
- When no filters: `Da = 0.0` (no penalty)
- When all weights zero: defaults to visual-only

### 5. Debug Information
Returns comprehensive debug data:
```json
{
  "weights_requested": {"visual": 0.5, "spatial": 0.4, "attr": 0.1},
  "weights_effective": {"visual": 0.5, "spatial": 0.4, "attr": 0.1},
  "rerank": "none|patch_min",
  "moved": 0
}
```

**Debug Features:**
- Shows requested vs effective weights
- Tracks ranking changes vs visual-only baseline
- Includes reranking status and latency

## ✅ Acceptance Criteria Met

### 1. Visual-Only Baseline
- `{weights:{visual:1, spatial:0, attr:0}}` matches baseline FAISS order
- `weights_effective.spatial == 0` when spatial features unavailable
- No errors when spatial features missing

### 2. Weight Shifting
- `{weights:{visual:0.5, spatial:0.4, attr:0.1}}` produces visible ranking shifts
- Effective weights properly normalized when signals missing
- Ranking changes tracked in debug output

### 3. Missing Signal Handling
- Spatial weight automatically zeroed when features unavailable
- Remaining weights re-normalized to sum to 1
- System continues working without spatial features

## 🔧 API Endpoints Updated

### `/search/id`
```json
{
  "image_id": "i_p_0001_hero2",
  "top_k": 12,
  "weights": {"visual": 1.0, "spatial": 0.0, "attr": 0.25},
  "filters": {"typology": null, "climate_bin": null, "massing_type": null},
  "strict": false,
  "mode": null
}
```

### `/search/file`
```python
# Query parameters
top_k: int = 12
w_visual: float = 1.0
w_attr: float = 0.25
w_spatial: float = 0.6
strict: bool = False
mode: Optional[str] = None  # "plan" for spatial features
```

## 🧪 Testing

- ✅ Weight normalization function tested
- ✅ Attribute distance calculation tested  
- ✅ Fusion logic with debug output tested
- ✅ API payload structure validated
- ✅ Edge cases handled (zero weights, missing signals)

## 🚀 Next Steps for Sprint B

1. **UI Tri-slider**: Implement V/S/A slider that sums to 1
2. **Quick Presets**: Visual/Balanced/Context-heavy presets
3. **Weight Persistence**: Store weights across queries
4. **Telemetry**: Track latency and ranking changes

## 📝 Commit Message
```
day8: unified late-fusion (visual/spatial/attr) + effective weight handling

- Added robust fusion with graceful signal degradation
- Implemented weight normalization (renorm_weights)
- Added comprehensive debug output with effective weights
- Updated request models for unified weight system
- Handles missing spatial features automatically
- Tracks ranking changes vs visual-only baseline
```
