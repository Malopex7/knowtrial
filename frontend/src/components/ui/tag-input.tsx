import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TagInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    tags: string[]
    setTags: React.Dispatch<React.SetStateAction<string[]>>
    placeholder?: string
}

export function TagInput({ tags, setTags, placeholder, className, ...props }: TagInputProps) {
    const [inputValue, setInputValue] = React.useState("")

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            const newTag = inputValue.trim()
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag])
                setInputValue("")
            }
        } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            setTags(tags.slice(0, -1))
        }
    }

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove))
    }

    return (
        <div className={cn("flex flex-wrap gap-2 rounded-md border border-input bg-background p-2", className)}>
            {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <div
                        className="cursor-pointer rounded-full p-0.5 hover:bg-muted-foreground/20"
                        onClick={(e) => {
                            e.stopPropagation(); // prevent focusing input if overlapping
                            removeTag(tag);
                        }}
                    >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {tag}</span>
                    </div>
                </Badge>
            ))}
            <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tags.length === 0 ? placeholder : ""}
                className="flex-1 border-0 bg-transparent p-0 placeholder:text-muted-foreground focus-visible:ring-0"
                {...props}
            />
        </div>
    )
}
