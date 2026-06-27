export interface ActionItem {
  owner: string;
  task: string;
  due: string;
}

export interface SummaryResponse {
  summary: string;
  action_items: ActionItem[];
}
