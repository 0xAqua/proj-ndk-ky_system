// 型定義
export interface Department {
    id: string;
    name: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    // avatarUrl は削除
    role: "admin" | "editor" | "viewer";
    status: "active" | "inactive" | "locked";
    lastLogin: string;
    // 複数兼任に対応するため配列に変更
    departments: Department[];
}

// モックデータ
export const MOCK_USERS_DATA: User[] = [
    {
        id: "u001",
        name: "山田 太郎",
        email: "taro.yamada@example.com",
        role: "admin",
        status: "active",
        lastLogin: "2024-03-10 09:15",
        departments: [
            { id: "d001", name: "システム開発部" },
            { id: "d002", name: "経営企画室" } // 兼任の例
        ]
    },
    {
        id: "u002",
        name: "鈴木 花子",
        email: "hanako.suzuki@example.com",
        role: "editor",
        status: "active",
        lastLogin: "2024-03-09 18:30",
        departments: [
            { id: "d003", name: "営業部" }
        ]
    },
    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },
    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },
    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },    {
        id: "u003",
        name: "佐藤 次郎",
        email: "jiro.sato@example.com",
        role: "viewer",
        status: "inactive",
        lastLogin: "2024-02-15 10:00",
        departments: [
            { id: "d004", name: "総務部" }
        ]
    },
    // ... 他のデータ
];