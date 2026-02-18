import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", size = "md", variant = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "px-3 py-1 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const variantClasses = {
      default:
        "bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors",
      outline:
        "border border-gray-300 text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-colors",
    };

    return (
      <button
        ref={ref}
        className={`${sizeClasses[size]} ${variantClasses[variant]} ${className} cursor-pointer flex items-center justify-center`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
