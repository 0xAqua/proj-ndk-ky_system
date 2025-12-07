import type { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

type AppProviderProps = {
    children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
    return (
        <QueryClientProvider client={queryClient}>
            <ChakraProvider value={system}>
                {children}
            </ChakraProvider>
        </QueryClientProvider>
    );
};