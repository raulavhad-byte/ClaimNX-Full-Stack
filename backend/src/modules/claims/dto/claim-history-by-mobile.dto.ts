import { IsString, IsUUID, Matches } from 'class-validator';

/**
 * A mobile number is PHI. It is intentionally submitted in the request body
 * (rather than a query string) so it is not exposed through URLs or routine
 * request-path logging.
 */
export class ClaimHistoryByMobileDto {
  @IsString()
  @Matches(/^\d{10}$/, { message: 'mobile must be a 10 digit number.' })
  mobile: string;

  @IsUUID()
  hospital_id: string;
}
