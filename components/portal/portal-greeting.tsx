interface PortalGreetingProps {
  businessName?: string | null
  contactName?: string | null
}

export function PortalGreeting({ businessName, contactName }: PortalGreetingProps) {
  const name = businessName?.trim() || contactName?.trim()
  if (!name) return null

  return (
    <h1 className="text-xl font-semibold">{name}</h1>
  )
}
