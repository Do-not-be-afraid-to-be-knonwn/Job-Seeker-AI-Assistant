import { z } from "zod";

export const YearsSchema = z.object({
  /**
   * Minimum years of experience required.
   * If only one number is mentioned, this equals maxYears.
   * Null if no experience requirement specified.
   */
  minYears: z.number().nullable(),

  /**
   * Maximum years of experience required or implied.
   * If only one number is mentioned (e.g., "5+ years"), this equals minYears.
   * If a range is given (e.g., "3-5 years"), this is the upper bound.
   * Null if no experience requirement specified.
   */
  maxYears: z.number().nullable(),
});

export type Years = z.infer<typeof YearsSchema>;
