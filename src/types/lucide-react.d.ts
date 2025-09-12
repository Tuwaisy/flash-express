declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  type IconProps = SVGProps<SVGSVGElement> & {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  };
  
  export const Rocket: FC<IconProps>;
  export const Eye: FC<IconProps>;
  export const Target: FC<IconProps>;
  export const Award: FC<IconProps>;
  export const Phone: FC<IconProps>;
  export const MessageCircle: FC<IconProps>;
  export const MapPin: FC<IconProps>;
  export const Clock: FC<IconProps>;
  export const Mail: FC<IconProps>;
  export const Zap: FC<IconProps>;
  export const Facebook: FC<IconProps>;
  export const Twitter: FC<IconProps>;
  export const Linkedin: FC<IconProps>;
  export const Menu: FC<IconProps>;
  export const X: FC<IconProps>;
  export const Package: FC<IconProps>;
  export const ArrowRight: FC<IconProps>;
  export const Truck: FC<IconProps>;
  export const Box: FC<IconProps>;
  export const PackagePlus: FC<IconProps>;
  export const Crown: FC<IconProps>;
  export const PackageCheck: FC<IconProps>;
  export const Shield: FC<IconProps>;
  export const Star: FC<IconProps>;
  export const Users: FC<IconProps>;
  export const Gem: FC<IconProps>;
  export const Quote: FC<IconProps>;
  export const Search: FC<IconProps>;
  export const CheckCircle: FC<IconProps>;
  export const AlertTriangle: FC<IconProps>;
  
  // Add more exports as needed
  const lucideReact: {
    [key: string]: FC<IconProps>;
  };
  
  export default lucideReact;
}
