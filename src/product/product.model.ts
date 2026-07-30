export enum ProductCategory {
    ELECTRONICS = 'ELECTRONICS',
    CLOTHING = 'CLOTHING',
    BOOKS = 'BOOKS'
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    category: ProductCategory;
    tags: string[];
    createdAt: Date;
}

export interface ProductResponse {
    data: Product[];
    total: number;
}