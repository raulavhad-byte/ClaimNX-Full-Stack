export class LoginResponseDto {
  access_token!: string;
  token_type!: string;
  expires_in!: string;

  user!: {
    id: string;
    email: string;
    display_name: string;
    role: string;
  };
}