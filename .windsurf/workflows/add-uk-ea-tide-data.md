---
description: Add UK Environment Agency real-time tide gauge data (addon to Workflow #12)
---

# Add UK Environment Agency Tide Data

Integrates UK Environment Agency Flood Monitoring API to provide real-time tide gauge readings for UK waters. This addon enhances the existing tide system with live UK data, creating a three-tier fallback: UK-EA (UK only) → NOAA (US only) → WorldTides (global).

## API Overview

- **URL**: https://environment.data.gov.uk/flood-monitoring/
- **Docs**: https://environment.data.gov.uk/flood-monitoring/doc/tidegauge
- **Free**: Yes, no API key required
- **Coverage**: 100+ UK coastal tide stations
- **Data**: Real-time measurements (not predictions)

## Key Difference

- NOAA/WorldTides: Predictions (future tides)
- UK-EA: Real-time measurements (current tide level)

## Implementation Tasks

### Phase 1: UK Environment Agency Service

1. Extend tide types for real-time data (`TideReading`, `TideGaugeData`)
2. Create UK-EA service in `src/services/uk-ea-tides.ts`
3. Update unified tide service with UK-EA priority

### Phase 2: UI Enhancements

4. Add real-time reading display to TideInfoCard
5. Add live data badge
6. Add tide chart for historical readings (optional)

### Phase 3: Testing

7. Test UK location with real-time data
8. Test fallback priority (UK-EA → NOAA → WorldTides)
9. Verify data quality and performance

## Fallback Priority

1. **UK waters** → UK Environment Agency (real-time)
2. **US waters** → NOAA (predictions)
3. **Global** → WorldTides (predictions)

## Success Criteria

- [ ] UK-EA API integrated
- [ ] Real-time gauge readings working
- [ ] Historical data displayed
- [ ] Smart fallback functional
- [ ] Live data badge shown
- [ ] No API key required
- [ ] No console errors
