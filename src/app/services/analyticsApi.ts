import apiClient from './apiClient';

export interface WeeklyPerformanceMetricDto {
  week: string;
  completed: number;
  rejected: number;
  avgHours: number;
}

export interface OwnerSalesOrdersMetricDto {
  done: number;
  inProgress: number;
}

export interface OwnerQualityControlMetricDto {
  accept: number;
  reject: number;
  scrap: number;
}

export interface OwnerDashboardDto {
  salesOrders: OwnerSalesOrdersMetricDto;
  qualityControl: OwnerQualityControlMetricDto;
  weeklyPerformance: WeeklyPerformanceMetricDto[];
}

export const analyticsApi = {
  async getOwnerDashboard(): Promise<OwnerDashboardDto> {
    const response = await apiClient.get<OwnerDashboardDto>('/api/v1/analytics/dashboard/owner');
    return response.data;
  },
};
