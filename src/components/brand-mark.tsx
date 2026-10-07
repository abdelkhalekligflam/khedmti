import Image from "next/image";

export default function BrandMark() {
  return (
    <Image
      className="logo"
      src="/khedmti-icon.svg?v=2"
      alt=""
      width={40}
      height={40}
      unoptimized
    />
  );
}
