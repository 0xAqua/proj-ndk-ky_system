import type {ReactNode} from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/lib/theme';

type AppProviderProps = {
    children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
    return (
        <ChakraProvider value={system}>
            {children}
        </ChakraProvider>
    );
};