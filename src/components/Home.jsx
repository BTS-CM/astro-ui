import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Home(properties) {

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-3 gap-3">
          <a href="/pool/index.html" style={{ textDecoration: 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle>💱 Pool exchange</CardTitle>
                <CardDescription>Trade using a liquidity pool</CardDescription>
              </CardHeader>
            </Card>
          </a>

          <a href="/dex/index.html" style={{ textDecoration: 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle>📈 DEX limit orders</CardTitle>
                <CardDescription>Create custom asset trades</CardDescription>
              </CardHeader>
            </Card>
          </a>

          <a href="/portfolio/index.html" style={{ textDecoration: 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle>💰 Portfolio</CardTitle>
                <CardDescription>View your portfolio</CardDescription>
              </CardHeader>
            </Card>
          </a>
        </div>
      </div>
    </>
  );
}
