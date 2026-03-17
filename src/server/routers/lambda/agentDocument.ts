import { z } from 'zod';

import {
  AgentDocumentModel,
  buildDocumentFilename,
  DocumentLoadFormat,
  DocumentLoadRule,
} from '@/database/models/agentDocuments';
import { DOCUMENT_TEMPLATES } from '@/database/models/agentDocuments/templates';
import { authedProcedure, router } from '@/libs/trpc/lambda';
import { serverDatabase } from '@/libs/trpc/lambda/middleware';
import { AgentDocumentsService } from '@/server/services/agentDocuments';

const toolLoadRuleSchema = z.object({
  keywordMatchMode: z.enum(['any', 'all']).optional(),
  keywords: z.array(z.string()).optional(),
  maxTokens: z.number().int().min(0).optional(),
  policyLoadFormat: z.nativeEnum(DocumentLoadFormat).optional(),
  priority: z.number().int().min(0).optional(),
  regexp: z.string().optional(),
  rule: z.nativeEnum(DocumentLoadRule).optional(),
  timeRange: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
});

const agentDocumentProcedure = authedProcedure.use(serverDatabase).use(async (opts) => {
  const { ctx } = opts;

  return opts.next({
    ctx: {
      agentDocumentModel: new AgentDocumentModel(ctx.serverDB, ctx.userId),
      agentDocumentService: new AgentDocumentsService(ctx.serverDB, ctx.userId),
    },
  });
});

export const agentDocumentRouter = router({
  /**
   * Get all available template sets
   */
  getTemplates: agentDocumentProcedure.query(async () => {
    return Object.entries(DOCUMENT_TEMPLATES).map(([id, template]) => ({
      description: template.description,
      id,
      name: template.name,
    }));
  }),

  /**
   * Get all documents for an agent
   */
  getDocuments: agentDocumentProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.agentDocumentService.getAgentDocuments(input.agentId);
    }),

  /**
   * Get a specific document by filename
   */
  getDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string(),
        filename: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.agentDocumentService.getDocument(input.agentId, input.filename);
    }),

  /**
   * Create or update a document
   */
  upsertDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string(),
        content: z.string(),
        filename: z.string(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.upsertDocument(
        input.agentId,
        input.filename,
        input.content,
        undefined,
        undefined,
        undefined,
        input.metadata,
      );
    }),

  /**
   * Delete a specific document
   */
  deleteDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string(),
        filename: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.agentDocumentService.getDocument(input.agentId, input.filename);
      if (!doc) return;

      return ctx.agentDocumentService.deleteDocument(doc.id);
    }),

  /**
   * Delete all documents for an agent
   */
  deleteAllDocuments: agentDocumentProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.deleteAllDocuments(input.agentId);
    }),

  /**
   * Initialize documents from a template set
   */
  initializeFromTemplate: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string(),
        templateSet: z.enum(Object.keys(DOCUMENT_TEMPLATES) as [string, ...string[]]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.initializeFromTemplate(
        input.agentId,
        input.templateSet as keyof typeof DOCUMENT_TEMPLATES,
      );
    }),

  /**
   * Get agent context for conversations
   */
  getContext: agentDocumentProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.agentDocumentService.getAgentContext(input.agentId);
    }),

  /**
   * Get documents as a map
   */
  getDocumentsMap: agentDocumentProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const map = await ctx.agentDocumentService.getDocumentsMap(input.agentId);
      // Convert Map to object for JSON serialization
      return Object.fromEntries(map);
    }),

  /**
   * Clone documents from one agent to another
   */
  cloneDocuments: agentDocumentProcedure
    .input(
      z.object({
        sourceAgentId: z.string(),
        targetAgentId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.cloneDocuments(
        input.sourceAgentId,
        input.targetAgentId,
      );
    }),

  /**
   * Check if agent has documents
   */
  hasDocuments: agentDocumentProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.agentDocumentService.hasDocuments(input.agentId);
    }),

  /**
   * Tool-oriented: create document
   */
  createDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string(),
        content: z.string(),
        title: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const filename = buildDocumentFilename(input.title);

      return ctx.agentDocumentService.upsertDocument(input.agentId, filename, input.content);
    }),

  /**
   * Tool-oriented: read document by id
   */
  readDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.agentDocumentService.getDocumentById(input.id, input.agentId);
    }),

  /**
   * Tool-oriented: edit document content by id
   */
  editDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        content: z.string(),
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.editDocumentById(input.id, input.content, input.agentId);
    }),

  /**
   * Tool-oriented: remove document by id
   */
  removeDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.agentDocumentService.removeDocumentById(input.id, input.agentId);
      return { deleted: true, id: input.id };
    }),

  /**
   * Tool-oriented: copy document by id
   */
  copyDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        id: z.string(),
        newTitle: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.copyDocumentById(input.id, input.newTitle, input.agentId);
    }),

  /**
   * Tool-oriented: rename document by id
   */
  renameDocument: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        id: z.string(),
        newTitle: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.renameDocumentById(input.id, input.newTitle, input.agentId);
    }),

  /**
   * Tool-oriented: update document load rule by id
   */
  updateLoadRule: agentDocumentProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        id: z.string(),
        rule: toolLoadRuleSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.agentDocumentService.updateLoadRuleById(input.id, input.rule, input.agentId);
    }),
});
