import { UsageItemDto } from './billing.model';
import { Role } from './user.model';

export type AiToolHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface AiJsonSchema {
  type?: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  format?: string;
  title?: string;
  description?: string;
  properties?: Record<string, AiJsonSchema>;
  required?: string[];
  items?: AiJsonSchema;
  enum?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  maxLength?: number;
  'x-options'?: AiSchemaOptionsSource;
  'x-enum-labels'?: Record<string, string>;
  'x-multiline'?: boolean;
  'x-hint'?: string;
}

export interface AiSchemaOptionsSource {
  path: string;
  items?: string;
  value: string;
  label: string;
}

export interface AiToolResponseDto {
  name: string;
  title: string;
  description: string;
  httpMethod: AiToolHttpMethod;
  pathTemplate: string;
  inputSchema: AiJsonSchema;
  requiresConfirmation: boolean;
  allowedRoles: Role[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiToolRequestDto {
  name: string;
  title: string;
  description: string;
  httpMethod: AiToolHttpMethod;
  pathTemplate: string;
  inputSchema: AiJsonSchema;
  requiresConfirmation: boolean;
  allowedRoles: Role[];
  active: boolean;
}

export interface AiProviderSettingsDto {
  id: string;
  displayName: string;
  configured: boolean;
  model: string;
  titleModel: string;
  defaultModel: string;
  defaultTitleModel: string;
}

export interface AiSettingsResponseDto {
  enabled: boolean;
  activeProvider: string;
  providers: AiProviderSettingsDto[];
}

export interface AiSettingsRequestDto {
  enabled: boolean;
  activeProvider: string;
  models: Record<string, { model: string; titleModel: string }>;
}

export interface AiStatusDto {
  enabled: boolean;
  configured: boolean;
  /** This month's AI message allowance; null when the user is not limited. */
  messages: UsageItemDto | null;
}

export interface AiConversationSummaryDto {
  slug: string;
  title: string | null;
  archived: boolean;
  lastMessageAt: string;
  createdAt: string;
}

export type AiChatItemType = 'USER' | 'ASSISTANT' | 'TOOL' | 'ACTION';
export type AiChatActionStatus = 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';

export interface AiChatActionDto {
  toolCallId: string;
  title: string;
  schema: AiJsonSchema | null;
  values: Record<string, unknown> | null;
  status: AiChatActionStatus;
  message: string | null;
}

export interface AiChatItemDto {
  type: AiChatItemType;
  text: string | null;
  toolName: string | null;
  title: string | null;
  action: AiChatActionDto | null;
  createdAt: string;
}

export interface AiConversationDetailDto {
  slug: string;
  title: string | null;
  archived: boolean;
  lastMessageAt: string;
  items: AiChatItemDto[];
  awaitingConfirmation: boolean;
}

export interface AiConversationUpdateRequestDto {
  title?: string;
  archived?: boolean;
}
