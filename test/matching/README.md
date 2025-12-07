# Matching System Validation Dataset

This directory contains a comprehensive validation dataset for testing the accuracy and quality of the job-resume matching system.

## Overview

The validation dataset consists of **20 carefully crafted test cases** representing realistic job postings and candidate resumes across different:

- **Experience levels**: Junior, Mid, Senior, Staff
- **Domains**: Backend, Frontend, Full Stack, DevOps, Mobile, Data Engineering, ML
- **Match quality categories**:
  - **Excellent** (85-95): 5 test cases - strong alignment across all dimensions
  - **Good** (70-84): 5 test cases - solid fit with minor gaps
  - **Fair** (50-69): 5 test cases - moderate alignment with notable gaps
  - **Poor** (20-49): 5 test cases - significant misalignment

## Files

- **[matchingValidation.dataset.json](./matchingValidation.dataset.json)** - The complete validation dataset with 20 test cases
- **[runValidationDataset.ts](./runValidationDataset.ts)** - Automated test runner and analysis script
- **README.md** - This file

## Running the Validation

### Quick Start

```bash
npm run validate:matching
```

This will:
1. Run all 20 test cases through the matching system
2. Compare actual results against expected scores, confidence levels, and explanations
3. Generate a detailed validation report
4. Export results to CSV for further analysis

### Expected Output

The validation script produces:

1. **Console Report** with:
   - Overall pass/fail statistics
   - Score accuracy metrics (within range, average deviation, max deviation)
   - Results broken down by category (excellent, good, fair, poor)
   - Confidence and gate accuracy percentages
   - Explanation quality metrics
   - Details of any failed tests

2. **CSV Export** (`validation-results.csv`):
   - Detailed results for each test case
   - Useful for tracking trends and analyzing specific failures

## Understanding Test Cases

Each test case includes:

### Input
- **jobDescription**: Realistic job posting text
- **resumeContent**: Realistic candidate resume

### Expected Results
- **expectedScore**: Min and max score range (e.g., 85-95)
- **expectedConfidence**: low, medium, or high
- **expectedGateResults**: Whether each gate should pass or fail

### Ground Truth
- **shouldMatch**: Boolean indicating if this is a good match
- **reasoning**: Why this score range is expected
- **expectedStrengths**: Key strengths the explanation should mention
- **expectedConcerns**: Key concerns the explanation should highlight
- **testFocus**: What specific aspect this test validates

## Example Test Cases

### Excellent Match (test-001)
- **Scenario**: Senior Backend Engineer with 7 years Python/Django experience
- **Expected**: 88-95 score, high confidence
- **Focus**: Perfect alignment on all dimensions

### Good Match (test-006)
- **Scenario**: Backend Engineer with 4 years vs 5+ required
- **Expected**: 72-82 score, medium confidence
- **Focus**: Minor experience gap within acceptable range

### Fair Match (test-011)
- **Scenario**: Junior applying for mid-level role
- **Expected**: 52-65 score, medium confidence
- **Focus**: Experience and skills gap

### Poor Match (test-016)
- **Scenario**: 1 year experience applying for senior role (7+ required)
- **Expected**: 28-42 score, medium confidence
- **Focus**: Massive experience and skills gap

## Test Coverage

The dataset tests various scenarios:

### Experience Gaps
- Perfect match (exceeds requirements)
- Minor gap (1-2 years below requirement)
- Moderate gap (2-3 years below)
- Major gap (5+ years below)

### Skills Matching
- Perfect skills coverage (95%+)
- Good coverage with minor gaps (70-90%)
- Moderate coverage (50-70%)
- Poor coverage (<50%)

### Domain Scenarios
- Exact domain match (Backend → Backend)
- Related domain (Django → FastAPI)
- Different but transferable (React → Angular)
- Completely different (Frontend → ML/AI)

### Special Cases
- **Career changers** (test-012): Bootcamp graduate with 1.5 years
- **Overqualified**: Candidates exceeding requirements
- **Underqualified**: Junior candidates for senior roles
- **Technology stack mismatch**: Related but different frameworks
- **Work authorization issues** (test-019): H1-B for classified role
- **Outdated skills** (test-018): 8-year career gap with legacy tech

## Validation Criteria

A test case **PASSES** if:
- ✅ Score falls within expected range (min-max)
- ✅ Confidence level matches expected (or within 1 level)
- ✅ All gate results (skills, experience, location, education) match expectations

## Interpreting Results

### Score Accuracy
- **Target**: 90%+ of tests within expected score range
- **Acceptable**: Average deviation ≤5 points
- **Concerning**: Max deviation >15 points

### Confidence Accuracy
- **Target**: 85%+ exact matches
- **Acceptable**: 95%+ within 1 level (e.g., medium vs high)

### Gate Accuracy
- **Target**: 95%+ correct gate pass/fail decisions
- **Critical**: Skills and location gates should never fail incorrectly

### Explanation Quality
- **Target**: 60%+ of expected strengths/concerns mentioned
- **Good**: Explanations capture the most important factors

## Maintaining the Dataset

When updating the matching algorithm:

1. Run `npm run validate:matching` before changes (baseline)
2. Make your algorithm changes
3. Run validation again
4. Compare results - scores should remain stable or improve
5. If intentional changes, update expected ranges in dataset

## Adding New Test Cases

To add test cases:

1. Add new entry to `testCases` array in `matchingValidation.dataset.json`
2. Use existing test cases as templates
3. Ensure you include all required fields
4. Set realistic expected scores based on:
   - Skills coverage
   - Experience alignment
   - Domain match
   - Gate requirements
5. Document the `testFocus` to explain what the test validates

## Performance Benchmarks

With 20 test cases, expect:
- **Total runtime**: ~2-3 minutes (with delays to avoid overwhelming system)
- **Per-test average**: ~6-8 seconds
- **Memory usage**: <500MB

## Troubleshooting

### Test Failures

If tests fail after making changes:

1. **Check score deviations**: Small deviations (±5 points) may be acceptable
2. **Review failed test details**: Look at specific strengths/concerns
3. **Validate gate logic**: Ensure critical gates aren't too strict/lenient
4. **Check edge cases**: Tests like career changers and domain mismatches are most sensitive

### Common Issues

- **Scores consistently too high**: Check if penalties are being applied
- **Scores consistently too low**: Check if bonuses are working
- **Gate failures**: Review gate threshold settings
- **Poor explanation quality**: Check if explanation engine is capturing key factors

## Future Enhancements

Potential additions to the dataset:

- [ ] More edge cases (international candidates, non-CS degrees)
- [ ] Specific industry domains (Healthcare, Finance, Gaming)
- [ ] Senior/Staff/Principal level validation
- [ ] Multi-language resumes
- [ ] Non-traditional backgrounds (self-taught, online courses)
- [ ] Overqualified scenarios (PhD for junior role)

## Questions or Issues?

If you encounter issues or have suggestions for improving the validation dataset, please open an issue or discuss with the team.
