export interface MealPlan {
  date: string;
  breakfastRequired: boolean;
  breakfastCount: number;
  lunchRequired: boolean;
  lunchCount: number;
  dinnerRequired: boolean;
  dinnerCount: number;
}

export interface VisitRequest {
  visitId?: string;
  mandalName: string;
  representativeName: string;
  representativePhone: string;
  numberOfRepresentatives: number;
  fromDate: string;
  toDate: string;
  arrivalTime: string;
  totalVisitors: number;
  mealPlans: MealPlan[];
  numberOfKids: number;
  numberOfElderly: number;
  specialRequirements: string;
  notes: string;
  status?: string;
  timestamp?: string;
}

export interface DailySummary {
  date: string;
  totalVisitors: number;
  breakfastCount: number;
  lunchCount: number;
  dinnerCount: number;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  visitId: string;
  timestamp: string;
  read: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  message: string;
}

export interface Stats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  cancelledRequests: number;
  totalVisitors: number;
  totalBreakfast: number;
  totalLunch: number;
  totalDinner: number;
}
