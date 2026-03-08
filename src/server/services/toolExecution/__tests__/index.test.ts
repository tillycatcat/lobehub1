// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolExecutionService } from '../index';

// Mock external dependencies
vi.mock('@/server/services/discover', () => ({
  DiscoverService: vi.fn().mockImplementation(() => ({
    callCloudMcpEndpoint: vi.fn(),
  })),
}));

vi.mock('@/server/services/mcp/contentProcessor', () => ({
  contentBlocksToString: vi.fn((blocks: any[]) => blocks.map((b: any) => b.text || '').join('')),
}));

vi.mock('@lobechat/utils', () => ({
  safeParseJSON: vi.fn((str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }),
}));

vi.mock('@/server/utils/truncateToolResult', () => ({
  DEFAULT_TOOL_RESULT_MAX_LENGTH: 6000,
  truncateToolResult: vi.fn((content: string, maxLength?: number) => {
    const limit = maxLength ?? 6000;
    return content.length > limit ? content.slice(0, limit) : content;
  }),
}));

describe('ToolExecutionService', () => {
  let service: ToolExecutionService;
  let mockBuiltinToolsExecutor: any;
  let mockMcpService: any;
  let mockPluginGatewayService: any;

  const baseContext = {
    toolManifestMap: {},
    userId: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockBuiltinToolsExecutor = {
      execute: vi.fn(),
    };

    mockMcpService = {
      callTool: vi.fn(),
    };

    mockPluginGatewayService = {
      execute: vi.fn(),
    };

    service = new ToolExecutionService({
      builtinToolsExecutor: mockBuiltinToolsExecutor,
      mcpService: mockMcpService,
      pluginGatewayService: mockPluginGatewayService,
    });
  });

  describe('executeTool', () => {
    describe('builtin type', () => {
      it('should route to builtinToolsExecutor for builtin type', async () => {
        const payload = {
          identifier: 'calculator',
          apiName: 'calculate',
          type: 'builtin' as any,
          arguments: '{"expression": "1+1"}',
        };

        mockBuiltinToolsExecutor.execute.mockResolvedValue({
          content: '2',
          success: true,
        });

        const result = await service.executeTool(payload, baseContext);

        expect(mockBuiltinToolsExecutor.execute).toHaveBeenCalledWith(payload, baseContext);
        expect(result.content).toBe('2');
        expect(result.success).toBe(true);
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('mcp type', () => {
      it('should return error when manifest not found', async () => {
        const payload = {
          identifier: 'unknown-mcp',
          apiName: 'someAction',
          type: 'mcp' as any,
          arguments: '{}',
        };

        const result = await service.executeTool(payload, { ...baseContext, toolManifestMap: {} });

        expect(result.success).toBe(false);
        expect(result.content).toContain('Manifest not found for tool: unknown-mcp');
        expect(result.error?.code).toBe('MANIFEST_NOT_FOUND');
      });

      it('should return error when mcpParams not found in manifest', async () => {
        const payload = {
          identifier: 'my-mcp',
          apiName: 'doSomething',
          type: 'mcp' as any,
          arguments: '{}',
        };

        const context = {
          ...baseContext,
          toolManifestMap: {
            'my-mcp': { identifier: 'my-mcp', api: [] } as any,
          },
        };

        const result = await service.executeTool(payload, context);

        expect(result.success).toBe(false);
        expect(result.content).toContain('MCP configuration not found');
        expect(result.error?.code).toBe('MCP_CONFIG_NOT_FOUND');
      });

      it('should execute stdio MCP tool successfully', async () => {
        const payload = {
          identifier: 'my-mcp',
          apiName: 'listFiles',
          type: 'mcp' as any,
          arguments: '{"path": "/tmp"}',
        };

        const context = {
          ...baseContext,
          toolManifestMap: {
            'my-mcp': {
              identifier: 'my-mcp',
              api: [],
              mcpParams: { type: 'stdio', name: 'my-mcp' },
            } as any,
          },
        };

        // mcpService.callTool returns a string or object; strings are used as-is
        mockMcpService.callTool.mockResolvedValue('file1.txt\nfile2.txt');

        const result = await service.executeTool(payload, context);

        expect(mockMcpService.callTool).toHaveBeenCalledWith({
          argsStr: '{"path": "/tmp"}',
          clientParams: { type: 'stdio', name: 'my-mcp' },
          toolName: 'listFiles',
        });
        expect(result.success).toBe(true);
        expect(result.content).toBe('file1.txt\nfile2.txt');
      });

      it('should handle MCP tool execution error', async () => {
        const payload = {
          identifier: 'my-mcp',
          apiName: 'failAction',
          type: 'mcp' as any,
          arguments: '{}',
        };

        const context = {
          ...baseContext,
          toolManifestMap: {
            'my-mcp': {
              identifier: 'my-mcp',
              api: [],
              mcpParams: { type: 'stdio', name: 'my-mcp' },
            } as any,
          },
        };

        mockMcpService.callTool.mockRejectedValue(new Error('Connection refused'));

        const result = await service.executeTool(payload, context);

        expect(result.success).toBe(false);
        expect(result.content).toBe('Connection refused');
        expect(result.error?.code).toBe('MCP_EXECUTION_ERROR');
      });

      it('should stringify object result from MCP tool', async () => {
        const payload = {
          identifier: 'my-mcp',
          apiName: 'getData',
          type: 'mcp' as any,
          arguments: '{}',
        };

        const context = {
          ...baseContext,
          toolManifestMap: {
            'my-mcp': {
              identifier: 'my-mcp',
              api: [],
              mcpParams: { type: 'http', url: 'http://localhost:3000' },
            } as any,
          },
        };

        const objectResult = { items: ['a', 'b', 'c'] };
        mockMcpService.callTool.mockResolvedValue(objectResult);

        const result = await service.executeTool(payload, context);

        expect(result.content).toBe(JSON.stringify(objectResult));
        expect(result.success).toBe(true);
      });
    });

    describe('default type (plugin gateway)', () => {
      it('should route to pluginGatewayService for default/standalone type', async () => {
        const payload = {
          identifier: 'my-plugin',
          apiName: 'search',
          type: 'default' as any,
          arguments: '{"query": "hello"}',
        };

        mockPluginGatewayService.execute.mockResolvedValue({
          content: 'Search results',
          success: true,
        });

        const result = await service.executeTool(payload, baseContext);

        expect(mockPluginGatewayService.execute).toHaveBeenCalledWith(payload, baseContext);
        expect(result.content).toBe('Search results');
        expect(result.success).toBe(true);
      });

      it('should route to pluginGatewayService for unknown types', async () => {
        const payload = {
          identifier: 'my-tool',
          apiName: 'run',
          type: 'markdown' as any,
          arguments: '{}',
        };

        mockPluginGatewayService.execute.mockResolvedValue({
          content: 'Output',
          success: true,
        });

        await service.executeTool(payload, baseContext);

        expect(mockPluginGatewayService.execute).toHaveBeenCalledWith(payload, baseContext);
      });
    });

    describe('result truncation', () => {
      it('should truncate long results', async () => {
        const payload = {
          identifier: 'my-plugin',
          apiName: 'getLargeData',
          type: 'default' as any,
          arguments: '{}',
        };

        const longContent = 'a'.repeat(10000);
        mockPluginGatewayService.execute.mockResolvedValue({
          content: longContent,
          success: true,
        });

        const result = await service.executeTool(payload, {
          ...baseContext,
          toolResultMaxLength: 100,
        });

        expect(result.content.length).toBe(100);
        expect(result.success).toBe(true);
      });

      it('should not truncate short results', async () => {
        const payload = {
          identifier: 'my-plugin',
          apiName: 'getSmallData',
          type: 'default' as any,
          arguments: '{}',
        };

        const shortContent = 'hello world';
        mockPluginGatewayService.execute.mockResolvedValue({
          content: shortContent,
          success: true,
        });

        const result = await service.executeTool(payload, baseContext);

        expect(result.content).toBe(shortContent);
      });
    });

    describe('error handling', () => {
      it('should handle top-level execution errors', async () => {
        const payload = {
          identifier: 'my-plugin',
          apiName: 'brokenTool',
          type: 'default' as any,
          arguments: '{}',
        };

        mockPluginGatewayService.execute.mockRejectedValue(new Error('Unexpected failure'));

        const result = await service.executeTool(payload, baseContext);

        expect(result.success).toBe(false);
        expect(result.content).toBe('Unexpected failure');
        expect(result.error?.message).toBe('Unexpected failure');
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });

      it('should include executionTime in error response', async () => {
        const payload = {
          identifier: 'my-plugin',
          apiName: 'slowBrokenTool',
          type: 'default' as any,
          arguments: '{}',
        };

        mockPluginGatewayService.execute.mockRejectedValue(new Error('Timeout'));

        const result = await service.executeTool(payload, baseContext);

        expect(result.executionTime).toBeTypeOf('number');
        expect(result.executionTime).toBeGreaterThanOrEqual(0);
      });
    });

    describe('cloud MCP type', () => {
      it('should execute cloud MCP tool successfully', async () => {
        const { DiscoverService } = await import('@/server/services/discover');
        const mockCallCloudMcpEndpoint = vi.fn().mockResolvedValue({
          content: [{ text: 'Cloud result', type: 'text' }],
          isError: false,
        });
        (DiscoverService as any).mockImplementation(() => ({
          callCloudMcpEndpoint: mockCallCloudMcpEndpoint,
        }));

        const payload = {
          identifier: 'cloud-mcp',
          apiName: 'fetchData',
          type: 'mcp' as any,
          arguments: '{"query": "test"}',
        };

        const context = {
          ...baseContext,
          toolManifestMap: {
            'cloud-mcp': {
              identifier: 'cloud-mcp',
              api: [],
              mcpParams: { type: 'cloud', endpoint: 'https://cloud.example.com' },
            } as any,
          },
        };

        const result = await service.executeTool(payload, context);

        expect(mockCallCloudMcpEndpoint).toHaveBeenCalledWith({
          apiParams: { query: 'test' },
          identifier: 'cloud-mcp',
          toolName: 'fetchData',
        });
        expect(result.success).toBe(true);
      });

      it('should handle cloud MCP tool error', async () => {
        const { DiscoverService } = await import('@/server/services/discover');
        (DiscoverService as any).mockImplementation(() => ({
          callCloudMcpEndpoint: vi.fn().mockRejectedValue(new Error('Cloud service unavailable')),
        }));

        const payload = {
          identifier: 'cloud-mcp',
          apiName: 'fetchData',
          type: 'mcp' as any,
          arguments: '{}',
        };

        const context = {
          ...baseContext,
          toolManifestMap: {
            'cloud-mcp': {
              identifier: 'cloud-mcp',
              api: [],
              mcpParams: { type: 'cloud', endpoint: 'https://cloud.example.com' },
            } as any,
          },
        };

        const result = await service.executeTool(payload, context);

        expect(result.success).toBe(false);
        expect(result.content).toBe('Cloud service unavailable');
        expect(result.error?.code).toBe('CLOUD_MCP_EXECUTION_ERROR');
      });

      it('should handle cloud MCP response with isError flag', async () => {
        const { DiscoverService } = await import('@/server/services/discover');
        (DiscoverService as any).mockImplementation(() => ({
          callCloudMcpEndpoint: vi.fn().mockResolvedValue({
            content: [{ text: 'Error from tool', type: 'text' }],
            isError: true,
          }),
        }));

        const payload = {
          identifier: 'cloud-mcp',
          apiName: 'failAction',
          type: 'mcp' as any,
          arguments: '{}',
        };

        const context = {
          ...baseContext,
          toolManifestMap: {
            'cloud-mcp': {
              identifier: 'cloud-mcp',
              api: [],
              mcpParams: { type: 'cloud', endpoint: 'https://cloud.example.com' },
            } as any,
          },
        };

        const result = await service.executeTool(payload, context);

        expect(result.success).toBe(false);
      });
    });
  });
});
