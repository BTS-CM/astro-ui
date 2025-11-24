import * as React from "react"
import { Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const themes = [
  { name: "Default", class: "" },
  { name: "Zinc", class: "theme-zinc" },
  { name: "Red", class: "theme-red" },
  { name: "Blue", class: "theme-blue" },
  { name: "Green", class: "theme-green" },
  { name: "Orange", class: "theme-orange" },
]

function ThemeDropdown() {
  const [theme, setTheme] = React.useState("")

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || ""
    setTheme(savedTheme)
    if (savedTheme) {
        document.documentElement.classList.add(savedTheme)
    }
    
    // Cleanup other themes
    themes.forEach(t => {
        if (t.class && t.class !== savedTheme) {
            document.documentElement.classList.remove(t.class)
        }
    })
  }, [])

  const changeTheme = (newTheme) => {
    if (theme) {
        document.documentElement.classList.remove(theme)
    }
    if (newTheme) {
        document.documentElement.classList.add(newTheme)
    }
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map((t) => (
          <DropdownMenuItem key={t.name} onClick={() => changeTheme(t.class)}>
            {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ThemeSelector() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Theme Customization</h1>
        <ThemeDropdown />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is a sample card to demonstrate the current theme colors.</p>
          </CardContent>
          <CardFooter>
            <Button>Primary Action</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Input fields and buttons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
               <Label htmlFor="password">Password</Label>
               <Input id="password" type="password" placeholder="Enter your password" />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button>Submit</Button>
          </CardFooter>
        </Card>

        <Card className="bg-secondary text-secondary-foreground">
          <CardHeader>
            <CardTitle>Secondary Card</CardTitle>
            <CardDescription>Using secondary colors</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This card uses the secondary color variables.</p>
          </CardContent>
          <CardFooter>
            <Button variant="secondary">Secondary Action</Button>
          </CardFooter>
        </Card>
        
        <Card className="bg-destructive text-destructive-foreground">
          <CardHeader>
            <CardTitle>Destructive Card</CardTitle>
            <CardDescription>Using destructive colors</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This card uses the destructive color variables.</p>
          </CardContent>
          <CardFooter>
            <Button variant="destructive">Destructive Action</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
