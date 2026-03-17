import type { LobeChatDatabase } from '@lobechat/database';

import {
  AgentDocumentModel,
  type AgentDocumentPolicy,
  type AgentDocumentWithRules,
  DocumentLoadPosition,
  type DocumentLoadRules,
  type ToolUpdateLoadRule,
} from '@/database/models/agentDocuments';
import type {
  DOCUMENT_TEMPLATES,
  DocumentTemplateSet,
} from '@/database/models/agentDocuments/templates';
import {
  getDocumentTemplate,
} from '@/database/models/agentDocuments/templates';

/**
 * Service for managing agent documents with reusable template sets.
 * Document-level policy controls runtime behavior (context rendering/retrieval).
 */
export class AgentDocumentsService {
  private agentDocumentModel: AgentDocumentModel;

  constructor(db: LobeChatDatabase, _userId: string) {
    this.agentDocumentModel = new AgentDocumentModel(db, _userId);
  }

  /**
   * Initialize documents from a specific template set.
   */
  async initializeFromTemplate(
    agentId: string,
    templateId: keyof typeof DOCUMENT_TEMPLATES = 'claw',
  ) {
    const templateSet = getDocumentTemplate(templateId);

    for (const template of templateSet.templates) {
      await this.agentDocumentModel.upsert(
        agentId,
        template.filename,
        template.content,
        template.loadPosition,
        template.loadRules,
        templateId,
        template.metadata,
      );
    }
  }

  /**
   * Initialize from a custom template set.
   */
  async initializeFromCustomTemplate(agentId: string, templateSet: DocumentTemplateSet) {
    for (const template of templateSet.templates) {
      await this.agentDocumentModel.upsert(
        agentId,
        template.filename,
        template.content,
        template.loadPosition,
        template.loadRules,
        templateSet.id,
        template.metadata,
      );
    }
  }

  /**
   * Switch agent to a different template set.
   * Optionally preserves custom document modifications.
   */
  async switchTemplate(agentId: string, newTemplateId: string, preserveCustomizations = false) {
    if (!preserveCustomizations) {
      await this.agentDocumentModel.deleteByAgent(agentId);
    }

    await this.initializeFromTemplate(agentId, newTemplateId as keyof typeof DOCUMENT_TEMPLATES);
  }

  /**
   * Backward-compatible alias.
   */
  async initializeFromPolicy(
    agentId: string,
    policyId: keyof typeof DOCUMENT_TEMPLATES = 'claw',
  ) {
    return this.initializeFromTemplate(agentId, policyId);
  }

  /**
   * Backward-compatible alias.
   */
  async initializeFromCustomPolicy(agentId: string, policy: DocumentTemplateSet) {
    return this.initializeFromCustomTemplate(agentId, policy);
  }

  /**
   * Backward-compatible alias.
   */
  async switchPolicy(agentId: string, newPolicyId: string, preserveCustomizations = false) {
    return this.switchTemplate(agentId, newPolicyId, preserveCustomizations);
  }

  async getAgentDocuments(agentId: string): Promise<AgentDocumentWithRules[]> {
    return this.agentDocumentModel.findByAgent(agentId);
  }

  async getDocumentsByTemplate(
    agentId: string,
    templateId: string,
  ): Promise<AgentDocumentWithRules[]> {
    return this.agentDocumentModel.findByTemplate(agentId, templateId);
  }

  async getDocumentsByPolicy(agentId: string, policyId: string): Promise<AgentDocumentWithRules[]> {
    return this.getDocumentsByTemplate(agentId, policyId);
  }

  async getDocument(agentId: string, filename: string) {
    return this.agentDocumentModel.findByFilename(agentId, filename);
  }

  async getDocumentById(id: string, expectedAgentId?: string) {
    return this.getDocumentByIdInAgent(id, expectedAgentId);
  }

  private async getDocumentByIdInAgent(documentId: string, expectedAgentId?: string) {
    const doc = await this.agentDocumentModel.findById(documentId);

    if (!doc) return undefined;
    if (expectedAgentId && doc.agentId !== expectedAgentId) return undefined;

    return doc;
  }

  async upsertDocument(
    agentId: string,
    filename: string,
    content: string,
    loadPosition?: DocumentLoadPosition,
    loadRules?: DocumentLoadRules,
    templateId?: string,
    metadata?: Record<string, any>,
    policy?: AgentDocumentPolicy,
  ) {
    return this.agentDocumentModel.upsert(
      agentId,
      filename,
      content,
      loadPosition,
      loadRules,
      templateId,
      metadata,
      policy,
    );
  }

  async deleteDocument(documentId: string) {
    return this.agentDocumentModel.delete(documentId);
  }

  async removeDocumentById(documentId: string, expectedAgentId?: string) {
    const doc = await this.getDocumentByIdInAgent(documentId, expectedAgentId);
    if (!doc) return;

    return this.deleteDocument(documentId);
  }

  async deleteAllDocuments(agentId: string) {
    return this.agentDocumentModel.deleteByAgent(agentId);
  }

  async deleteTemplateDocuments(agentId: string, templateId: string) {
    return this.agentDocumentModel.deleteByTemplate(agentId, templateId);
  }

  async deletePolicyDocuments(agentId: string, policyId: string) {
    return this.deleteTemplateDocuments(agentId, policyId);
  }

  async getInjectableDocuments(
    agentId: string,
    context: {
      userMessage?: string;
      currentTime?: Date;
    },
  ): Promise<AgentDocumentWithRules[]> {
    return this.agentDocumentModel.getInjectableDocuments(agentId, context);
  }

  async getDocumentsByPosition(agentId: string) {
    return this.agentDocumentModel.getDocumentsByPosition(agentId);
  }

  async getAgentContext(agentId: string): Promise<string> {
    return this.agentDocumentModel.getAgentContext(agentId);
  }

  async getDocumentsMap(agentId: string) {
    const docs = await this.agentDocumentModel.findByAgent(agentId);
    return new Map(docs.map((doc) => [doc.filename, doc.content]));
  }

  async hasDocuments(agentId: string): Promise<boolean> {
    const docs = await this.getAgentDocuments(agentId);
    return docs.length > 0;
  }

  async getAgentTemplate(agentId: string): Promise<string | null> {
    const docs = await this.getAgentDocuments(agentId);
    if (docs.length === 0) return null;

    const templateCounts = new Map<string, number>();
    for (const doc of docs) {
      if (doc.templateId) {
        templateCounts.set(doc.templateId, (templateCounts.get(doc.templateId) || 0) + 1);
      }
    }

    let maxCount = 0;
    let currentTemplate: string | null = null;
    for (const [templateId, count] of templateCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        currentTemplate = templateId;
      }
    }

    return currentTemplate;
  }

  async getAgentPolicy(agentId: string): Promise<string | null> {
    return this.getAgentTemplate(agentId);
  }

  async cloneDocuments(sourceAgentId: string, targetAgentId: string) {
    const sourceDocs = await this.getAgentDocuments(sourceAgentId);

    for (const doc of sourceDocs) {
      await this.upsertDocument(
        targetAgentId,
        doc.filename,
        doc.content,
        (doc.policy?.context?.position as DocumentLoadPosition | undefined) ||
          DocumentLoadPosition.BEFORE_FIRST_USER,
        doc.loadRules,
        doc.templateId || undefined,
        doc.metadata || undefined,
        doc.policy || undefined,
      );
    }
  }

  async editDocumentById(documentId: string, content: string, expectedAgentId?: string) {
    const doc = await this.getDocumentByIdInAgent(documentId, expectedAgentId);
    if (!doc) return undefined;

    await this.agentDocumentModel.update(documentId, content);
    return this.agentDocumentModel.findById(documentId);
  }

  async renameDocumentById(documentId: string, newTitle: string, expectedAgentId?: string) {
    const doc = await this.getDocumentByIdInAgent(documentId, expectedAgentId);
    if (!doc) return undefined;

    return this.agentDocumentModel.rename(documentId, newTitle);
  }

  async copyDocumentById(documentId: string, newTitle?: string, expectedAgentId?: string) {
    const doc = await this.getDocumentByIdInAgent(documentId, expectedAgentId);
    if (!doc) return undefined;

    return this.agentDocumentModel.copy(documentId, newTitle);
  }

  async updateLoadRuleById(documentId: string, rule: ToolUpdateLoadRule, expectedAgentId?: string) {
    const doc = await this.getDocumentByIdInAgent(documentId, expectedAgentId);
    if (!doc) return undefined;

    return this.agentDocumentModel.updateToolLoadRule(documentId, rule);
  }

  async exportAsTemplate(agentId: string, templateName: string): Promise<DocumentTemplateSet> {
    const docs = await this.getAgentDocuments(agentId);

    return {
      id: `custom-${agentId}`,
      name: templateName,
      description: `Custom template exported from agent ${agentId}`,
      tags: ['custom', 'exported'],
      templates: docs.map((doc) => ({
        title: doc.title,
        filename: doc.filename,
        description: `Exported from ${doc.filename}`,
        content: doc.content,
        loadPosition:
          (doc.policy?.context?.position as DocumentLoadPosition | undefined) ||
          DocumentLoadPosition.BEFORE_FIRST_USER,
        loadRules: doc.loadRules,
        metadata: doc.metadata || undefined,
      })),
    };
  }

  async exportAsPolicy(agentId: string, policyName: string): Promise<DocumentTemplateSet> {
    return this.exportAsTemplate(agentId, policyName);
  }
}
