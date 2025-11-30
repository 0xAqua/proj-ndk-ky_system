import { MainLayout } from "@/components/layout/MainLayout.tsx";
import { EntryForm } from "@/features/entry/components/EntryForm";

const EntryPage = () => {
    return (
        <MainLayout>
            <EntryForm />
        </MainLayout>

    );
};

export default EntryPage;