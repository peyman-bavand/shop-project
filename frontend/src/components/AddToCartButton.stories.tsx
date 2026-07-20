import Image from "next/image";
import type { Meta, StoryObj } from "@storybook/nextjs";
import AddToCartButton from "./AddToCartButton";

const meta: Meta<typeof AddToCartButton> = {
  title: "Shop/AddToCartButton",
  component: AddToCartButton,
};

export default meta;

type Story = StoryObj<typeof AddToCartButton>;

const sampleProduct = {
  bookId: 1,
  slug: "sample-book",
  title: "کتاب نمونه",
  author: "نویسنده نمونه",
  price: 120000,
  stock: 5,
  image: "/placeholder.png",
};

export const Standalone: Story = {
  args: {
    product: sampleProduct,
  },
};

export const InBookView: Story = {
  render: () => (
    <div className="max-w-sm space-y-4 rounded-lg border p-4">
      <div className="relative h-48 w-full overflow-hidden rounded">
        <Image
          src={sampleProduct.image}
          alt={sampleProduct.title}
          fill
          sizes="400px"
          className="object-cover"
        />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{sampleProduct.title}</h2>
        <p className="text-sm text-gray-600">{sampleProduct.author}</p>
        <p className="text-sm">{sampleProduct.price.toLocaleString()} تومان</p>
      </div>

      <AddToCartButton product={sampleProduct} />
    </div>
  ),
};


export const OutOfStockInBookView: Story = {
  render: () => {
    const product = {
      ...sampleProduct,
      stock: 0,
      title: "کتاب ناموجود",
      slug: "out-of-stock-book",
    };

    return (
      <div className="max-w-sm space-y-4 rounded-lg border p-4">
        <div className="relative h-48 w-full overflow-hidden rounded">
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="400px"
            className="object-cover"
          />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold">{product.title}</h2>
          <p className="text-sm text-gray-600">{product.author}</p>
          <p className="text-sm">{product.price.toLocaleString()} تومان</p>
        </div>

        <AddToCartButton product={product} />
      </div>
    );
  },
};
