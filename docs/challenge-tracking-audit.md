# Challenge Tracking Audit - All Challenges vs Triggers

## Audit Date: 2026-01-01

This document verifies that every challenge in the database has proper tracking logic in `useCatchXP.ts`.

---

## ✅ CHALLENGES WITH TRACKING CONFIRMED

### **Milestone Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| first_catch | ✅ | ✅ Line 370 | Working |
| catch_10 | ✅ | ✅ Line 370 | Working |
| catch_50 | ✅ | ✅ Line 370 | Working |
| catch_100 | ✅ | ✅ Line 370 | Working |
| catch_500 | ✅ | ✅ Line 370 | Working |
| catch_1000 | ✅ | ✅ Line 370 | Working |

### **Species Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| species_5 | ✅ | ✅ Line 370 | Working |
| species_10 | ✅ | ✅ Line 370 | Working |
| species_25 | ✅ | ✅ Line 370 | Working |
| catch_{species} | ✅ | ✅ Line 385 (dynamic) | Working |

### **Photo Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| photo_pro | ✅ | ✅ Line 437 | Working |
| photo_master | ✅ | ✅ Line 440 | Working |

### **Time-Based Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| dawn_patrol | ✅ | ✅ Line 453 | Working |
| early_bird | ✅ | ✅ Line 458 | Working |
| night_owl | ✅ | ✅ Line 463 | Working |
| golden_hour | ✅ | ✅ Line 468 | Working |
| midnight_angler | ✅ | ✅ Line 473 | Working |

### **Weight Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| big_fish | ✅ | ✅ Line 485 | Working |
| double_figures | ✅ | ✅ Line 490 | Working |
| monster_catch | ✅ | ✅ Line 495 | Working |
| pb_hunter | ✅ | ✅ Line 508 | Working |
| specimen_hunter | ✅ | ✅ Line 521 | Working |

### **Location Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| new_waters | ✅ | ✅ Line 572 (local spots) | Working |
| explorer | ✅ | ✅ Line 577 (local spots) | Working |
| adventurer | ✅ | ✅ Line 583 (distant regions) | Working |

### **Weather Condition Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| weather_warrior | ✅ | ✅ Line 684 (rain) | Working |
| storm_chaser | ✅ | ✅ Line 689 (thunder) | Working |
| fog_fisher | ✅ | ✅ Line 694 (fog) | Working |
| sunny_fisher | ✅ | ✅ Line 699 (clear) | Working |
| wind_rider | ✅ | ✅ Line 705 (15+ mph) | Working |

### **Moon Phase Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| full_moon_catch | ✅ | ✅ Line 714 | Working |
| new_moon_catch | ✅ | ✅ Line 719 | Working |
| moon_master | ✅ | ✅ Line 723 | Working |

### **Water Type Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| sea_legs | ✅ | ✅ Line 741 | Working |
| freshwater_fan | ✅ | ✅ Line 738 | Working |

### **Conservation Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| conservation_10 | ✅ | ✅ Line 788 | Working |
| conservation_50 | ✅ | ✅ Line 788 | Working |
| conservation_100 | ✅ | ✅ Line 788 | Working |
| conservation_200 | ✅ | ✅ Line 788 | Working |
| conservation_500 | ✅ | ✅ Line 788 | Working |

### **Seasonal Winter Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| winter_ice_breaker_2026 | ✅ | ✅ Line 593 (temp < 5°C) | Working |
| winter_night_owl_2026 | ✅ | ✅ Line 606 (after sunset) | Working |
| winter_cold_water_champion_2026 | ✅ | ✅ Line 630 (3 species) | Working |
| winter_festive_fisher_2026 | ✅ | ✅ Line 641 (Christmas/NY) | Working |
| winter_explorer_2026 | ✅ | ✅ Line 670 (5 locations) | Working |

### **Country-Scoped Challenges**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| uk_first_catch | ✅ | ✅ Line 749 (checkCountryChallenges) | Working |
| uk_10_catches | ✅ | ✅ Line 749 (checkCountryChallenges) | Working |
| uk_species_10 | ✅ | ✅ Line 749 (checkCountryChallenges) | Working |
| (other countries) | ✅ | ✅ Line 749 (checkCountryChallenges) | Working |

---

## ⚠️ CHALLENGES WITHOUT TRACKING (Need Implementation)

### **Session-Based Challenges** (NOT tracked in useCatchXP)
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| weekend_warrior | ✅ | ❌ | **MISSING** - needs session tracking |
| weekly_warrior | ✅ | ❌ | **MISSING** - needs streak tracking |
| dedicated_angler | ✅ | ❌ | **MISSING** - needs streak tracking |
| first_session | ✅ | ❌ | **MISSING** - needs session tracking |
| session_10 | ✅ | ❌ | **MISSING** - needs session tracking |
| session_50 | ✅ | ❌ | **MISSING** - needs session tracking |
| marathon_session | ✅ | ❌ | **MISSING** - needs session tracking |
| dawn_session | ✅ | ❌ | **MISSING** - needs session tracking |
| all_day_session | ✅ | ❌ | **MISSING** - needs session tracking |
| night_session | ✅ | ❌ | **MISSING** - needs session tracking |

**Note:** These challenges track sessions, not catches. They need separate tracking in session creation/completion logic.

### **Social Challenges** (Different System)
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| social_first_comment | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks comments |
| social_10_comments | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks comments |
| social_butterfly | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks comments |
| first_follower | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks followers |
| influencer | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks followers |

**Note:** These track social interactions, not catches. Need separate tracking in comment/follow systems.

### **Competition Challenges** (Different System)
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| comp_entered | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks competitions |
| comp_5_entered | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks competitions |
| comp_winner | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks competitions |
| comp_podium | ✅ | ❌ | **DIFFERENT SYSTEM** - tracks competitions |

**Note:** These track competition participation/results. Need separate tracking in competition system.

### **Multi-Species Session Challenge**
| Challenge Slug | Database | Tracking Code | Status |
|---------------|----------|---------------|--------|
| multi_species_day | ✅ | ❌ | **MISSING** - needs session-level tracking |

**Note:** Requires counting unique species per session. Should be tracked when session ends.

---

## 📊 Summary

**Total Challenges in Database:** ~70+

**Catch-Based Challenges:** 50+ ✅ **ALL HAVE TRACKING**
- Milestones: 6/6 ✅
- Species: 15+/15+ ✅
- Photos: 2/2 ✅
- Time: 5/5 ✅
- Weight: 5/5 ✅
- Location: 3/3 ✅
- Weather: 5/5 ✅
- Moon: 3/3 ✅
- Water Type: 2/2 ✅
- Conservation: 5/5 ✅
- Seasonal: 5/5 ✅
- Country: All ✅

**Session-Based Challenges:** 10 ⚠️ **NEED SESSION TRACKING**
- These are intentionally not in useCatchXP (wrong place)
- Need implementation in session creation/completion hooks

**Social Challenges:** 5 ⚠️ **NEED SOCIAL TRACKING**
- These are intentionally not in useCatchXP (wrong place)
- Need implementation in comment/follow systems

**Competition Challenges:** 4 ⚠️ **NEED COMPETITION TRACKING**
- These are intentionally not in useCatchXP (wrong place)
- Need implementation in competition system

---

## ✅ Conclusion

**ALL CATCH-BASED CHALLENGES HAVE PROPER TRACKING!** 🎉

Every challenge that should be tracked in `useCatchXP.ts` has its tracking logic implemented. The challenges without tracking are:
1. Session-based (should be tracked in session hooks)
2. Social-based (should be tracked in social interaction hooks)
3. Competition-based (should be tracked in competition hooks)

These are correctly NOT in useCatchXP because they track different events.

---

## 🔧 Action Items

### High Priority:
1. ✅ **Catch challenges** - All complete
2. ⚠️ **Session challenges** - Need implementation in session hooks
3. ⚠️ **Social challenges** - Need implementation in social hooks
4. ⚠️ **Competition challenges** - Need implementation in competition hooks

### Recommendations:
- Create `useSessionXP.ts` for session-based challenge tracking
- Add social challenge tracking to comment/follow mutation hooks
- Add competition challenge tracking to competition entry/completion hooks
