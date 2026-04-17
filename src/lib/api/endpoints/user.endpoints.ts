import apiClient from "../clients/apiClient";
import { UserProfile, UpdateProfileRequest, ChangePasswordRequest } from "@/types/models/user.model";
import { ApiResponse } from "@/types/api/api.types";

export const userEndpoints = {
  getProfile: async (): Promise<ApiResponse<UserProfile>> => {
    const response = await apiClient.get<ApiResponse<UserProfile>>("/auth/users/profile");
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> => {
    const response = await apiClient.put<ApiResponse<UserProfile>>("/auth/users/profile", data);
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>("/auth/users/change-password", data);
    return response.data;
  },

  setupMfa: async (): Promise<ApiResponse<{ qrCode: string, secret: string }>> => {
    const response = await apiClient.post<ApiResponse<{ qrCode: string, secret: string }>>("/auth/users/mfa/setup");
    return response.data;
  },

  enableMfa: async (token: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>("/auth/users/mfa/enable", { token });
    return response.data;
  },

  disableMfa: async (password: string, token: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>("/auth/users/mfa/disable", { password, token });
    return response.data;
  },


  updateAvatar: async (file: File): Promise<ApiResponse<UserProfile>> => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiClient.post<ApiResponse<UserProfile>>(
      "/auth/users/profile/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};
