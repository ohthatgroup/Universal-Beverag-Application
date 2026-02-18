export default function OrderPage({ params }: { params: { date: string } }) {
  return <div>Order for {params.date}</div>
}
