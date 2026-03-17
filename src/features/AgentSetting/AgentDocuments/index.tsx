'use client';

import { App, Button, List, Popconfirm, Select, Space, Tag, Typography } from 'antd';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useClientDataSWR } from '@/libs/swr';
import { agentDocumentService } from '@/services/agentDocument';
import { useAgentStore } from '@/store/agent';

interface AgentDocumentItem {
  filename: string;
  id: string;
  templateId: string | null;
  title: string;
}

interface TemplateItem {
  description?: string;
  id: string;
  name: string;
}

const DEFAULT_TEMPLATE_ID = 'claw';

const AgentDocuments = memo(() => {
  const { t } = useTranslation('setting');
  const { message } = App.useApp();
  const agentId = useAgentStore((s) => s.activeAgentId);
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);

  const {
    data: documents = [],
    isLoading: isDocumentsLoading,
    mutate: mutateDocuments,
  } = useClientDataSWR(
    agentId ? ([`agent-documents`, agentId] as const) : null,
    async ([, id]) => agentDocumentService.getDocuments({ agentId: id }),
  );

  const {
    data: templates = [],
    isLoading: isTemplatesLoading,
  } = useClientDataSWR('agent-document-templates', () => agentDocumentService.getTemplates());

  const templateOptions = useMemo(
    () =>
      (templates as TemplateItem[]).map((item) => ({
        label: item.name,
        title: item.description,
        value: item.id,
      })),
    [templates],
  );

  const initializeTemplate = async () => {
    if (!agentId) return;

    try {
      await agentDocumentService.initializeFromTemplate({
        agentId,
        templateSet: templateId,
      });
      await mutateDocuments();
      message.success(t('agentDocuments.applySuccess'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to apply template');
    }
  };

  const removeDocument = async (id: string) => {
    try {
      await agentDocumentService.removeDocument({ id });
      await mutateDocuments();
      message.success(t('agentDocuments.deleteSuccess'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Failed to delete document');
    }
  };

  return (
    <Space direction={'vertical'} size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ marginBottom: 0, marginTop: 0 }}>
        {t('agentDocuments.title')}
      </Typography.Title>
      <Typography.Text type={'secondary'}>{t('agentDocuments.desc')}</Typography.Text>

      <Space wrap align={'center'}>
        <Select
          loading={isTemplatesLoading}
          options={templateOptions}
          style={{ minWidth: 240 }}
          value={templateId}
          onChange={setTemplateId}
        />
        <Button disabled={!agentId} type={'primary'} onClick={initializeTemplate}>
          {t('agentDocuments.applyTemplate')}
        </Button>
      </Space>

      <List
        bordered
        dataSource={documents as AgentDocumentItem[]}
        loading={isDocumentsLoading}
        locale={{ emptyText: t('agentDocuments.empty') }}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Popconfirm
                key={`delete-${item.id}`}
                title={t('agentDocuments.deleteConfirm')}
                onConfirm={() => removeDocument(item.id)}
              >
                <Button danger type={'link'}>
                  {t('agentDocuments.delete')}
                </Button>
              </Popconfirm>,
            ]}
          >
            <Space direction={'vertical'} size={0}>
              <Typography.Text strong>{item.title || item.filename}</Typography.Text>
              <Typography.Text type={'secondary'}>{item.filename}</Typography.Text>
            </Space>
            {item.templateId ? <Tag>{item.templateId}</Tag> : null}
          </List.Item>
        )}
      />
    </Space>
  );
});

export default AgentDocuments;
