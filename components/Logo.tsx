import icon from "@/images/icon.png";
import Image, { type ImageProps } from "next/image";

type LogoProps = Omit<ImageProps, "src"> & { alt?: string };

export function Logo({ className, alt = "Power Platform ToolBox logo", ...props }: LogoProps) {
    return <Image src={icon} alt={alt} className={className} priority {...props} />;
}
