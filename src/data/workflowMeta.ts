import type { WorkflowTriggerType, WorkflowActionType } from '../types/crm';

// Mirrors backend/automation.js VALID_TRIGGER_TYPES / VALID_ACTION_TYPES — keep in sync.
// Shared by AddWorkflowModal, WorkflowsView (lead scoring / webhooks event pickers).
export const TRIGGER_TYPES: { value: WorkflowTriggerType; label: string }[] = [
  { value: 'lead.created', label: 'New lead received' },
  { value: 'lead.message_received', label: 'Lead sends a message' },
  { value: 'lead.allocated', label: 'Lead is allocated to a sales rep' },
  { value: 'deal.created', label: 'New deal created' },
  { value: 'deal.stage_changed', label: 'Deal moves to a stage' },
  { value: 'deal.won', label: 'Deal is marked Closed Won' },
  { value: 'task.completed', label: 'Task is completed' },
  { value: 'schedule.lead_no_reply', label: 'Lead has not replied for N hours (checked every 15 min)' },
];

export const ACTION_TYPES: { value: WorkflowActionType; label: string; paramLabel: string; paramKey: string; placeholder: string }[] = [
  { value: 'create_task', label: 'Create a follow-up task', paramLabel: 'Task title', paramKey: 'title', placeholder: 'e.g. Call the lead back' },
  { value: 'send_notification', label: 'Notify the owner', paramLabel: 'Notification message', paramKey: 'message', placeholder: 'e.g. Hot lead needs attention' },
  { value: 'assign_lead', label: 'Assign the lead to a user', paramLabel: 'User ID', paramKey: 'userId', placeholder: 'e.g. USR-123' },
  { value: 'add_tag', label: 'Tag the lead', paramLabel: 'Tag ID', paramKey: 'tagId', placeholder: 'e.g. 3' },
  { value: 'move_deal_stage', label: 'Move the deal to a stage', paramLabel: 'Stage ID', paramKey: 'stageId', placeholder: 'e.g. closed_won' },
];
