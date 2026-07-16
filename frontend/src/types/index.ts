// frontend/src/types/index.ts

export interface BookList {
  id: number;
  title: string;
  slug: string;
  author: string;
  translator: string | null;
  price: number;
  stock: number;
  cover_type: 'hardback' | 'paperback' | 'pocket';
  main_image: string | null;
}

export interface BookImage {
  id: number;
  image: string;
  is_main: boolean;
}

export interface BookComment {
  id: number;
  author: string;
  text: string;
  created_at: string;
}

export interface BookDetail extends Omit<BookList, 'main_image'> {
  isbn: string;
  number_of_pages: number;
  publish_year: number;
  description: string;
  images: BookImage[];
  comments: BookComment[];
  is_active: boolean;
  created_at: string;
}
