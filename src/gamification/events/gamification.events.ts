export const TODO_COMPLETED_EVENT = 'todo.completed';

export interface TodoCompletedPayload {
    userId: number;
    taskId: number;
    completedAt?: string; // ISO
}
