import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  container: css`
    overflow: hidden;
    display: flex;
    flex-direction: column;

    height: 100vh;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;

    background: ${token.colorBgContainer};

    -webkit-app-region: drag;
  `,
  input: css`
    flex: 1;

    border: none;

    font-size: 16px;
    color: ${token.colorText};

    background: transparent;
    outline: none;

    &::placeholder {
      color: ${token.colorTextQuaternary};
    }
  `,
  inputArea: css`
    display: flex;
    gap: 8px;
    align-items: center;

    padding-block: 8px;
    padding-inline: 16px;

    -webkit-app-region: no-drag;
  `,
}));
