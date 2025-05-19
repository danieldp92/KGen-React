import * as React from 'react';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AppCacheProvider } from '@mui/material-nextjs/v14-pagesRouter';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import type { NextPage } from 'next';
import type { AppProps } from 'next/app';
import type { Navigation } from '@toolpad/core/AppProvider';


import theme from '../theme';
import ShieldIcon from "@mui/icons-material/Shield";

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: React.ReactElement) => React.ReactNode;
  
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const NAVIGATION: Navigation = [
  {
    kind: 'header',
    title: 'Main items',
  },
  {
    segment: '',
    title: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    segment: 'employees',
    title: 'Anonymization Strrategies',
    icon: <ShieldIcon />,
    pattern: 'employees{/:employeeId}*',
  },
];

const BRANDING = {
  title: 'KGen Anonymization Platform',
};



function DefaultLayout({ page }: { page: React.ReactElement<any> }) {
  const router = useRouter();
  const { segments = [] } = router.query;
  const [employeeId] = segments;

  const title = React.useMemo(() => {
    if (router.asPath.split('?')[0] === '/employees/new') {
      return 'New Employee';
    }
    if (employeeId && router.asPath.includes('/edit')) {
      return `Employee ${employeeId} - Edit`;
    }
    if (employeeId) {
      return `Employee ${employeeId}`;
    }
    return undefined;
  }, [employeeId, router.asPath]);

  return (
    <DashboardLayout>
      <PageContainer title={title}>{page}</PageContainer>
    </DashboardLayout>
  );
}

function getDefaultLayout(page: React.ReactElement<any>) {
  return <DefaultLayout page={page} />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  
  return (
    <React.Fragment>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <NextAppProvider
        navigation={NAVIGATION}
        branding={BRANDING}
        
        theme={theme}
      >
        {children}
      </NextAppProvider>
    </React.Fragment>
  );
}

export default function App(props: AppPropsWithLayout) {
  const {
    Component,
    pageProps,
  } = props;

  const getLayout = Component.getLayout ?? getDefaultLayout;
  let pageContent = getLayout(<Component {...pageProps} />);
  pageContent = <AppLayout>{pageContent}</AppLayout>;

  return (
    <AppCacheProvider {...props}>
      
        {pageContent}
      
    </AppCacheProvider>
  );
}
