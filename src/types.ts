export type Priority = "high" | "medium" | "low";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TaskInput = Pick<Task, "title" | "description" | "priority" | "dueDate">;

export type Filter = "all" | "active" | "completed";

export type SortKey = "custom" | "created" | "priority" | "due_date";

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  conditionText: string;
  icon: string;
  city: string;
  updatedAt: number;
}
