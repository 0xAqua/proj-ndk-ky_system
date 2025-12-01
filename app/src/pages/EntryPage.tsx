import {EntryForm} from "@/features/entry/components/EntryForm.tsx";
import {MainLayout} from "@/components/layout/MainLayout.tsx";

const EntryPage = () => {

    return (
        <MainLayout>
            <EntryForm />
        </MainLayout>
    );
};

export default EntryPage;