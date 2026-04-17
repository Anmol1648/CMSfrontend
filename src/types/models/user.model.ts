export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  phone?: string;
  gender?: "Male" | "Female" | "Other";
  date_of_birth?: string;
  avatar_url?: string;
  
  // Address fields
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  
  createAt: string;
  updateAt: string;
  
  // Nested User model
  user?: {
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    mfa_enabled: boolean;
  };
}

export interface UpdateProfileRequest {
  phone?: string;
  gender?: "Male" | "Female" | "Other";
  date_of_birth?: string;
  avatar_url?: string;
  
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface PasswordUpdateRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
