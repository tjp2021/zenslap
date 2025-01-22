import { Card, CardContent } from "@/components/ui/card"
import { useTicketCounts } from "@/hooks/useTicketCounts"
import { Skeleton } from "@/components/ui/skeleton"

export function OpenTicketsCounter() {
	const { counts, loading, error } = useTicketCounts()

	if (loading) {
		return (
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-4">Open Tickets (current)</h3>
					<div className="flex justify-around">
						<div className="text-center">
							<Skeleton className="h-12 w-12 mx-auto mb-2" />
							<Skeleton className="h-4 w-16" />
						</div>
						<div className="text-center">
							<Skeleton className="h-12 w-12 mx-auto mb-2" />
							<Skeleton className="h-4 w-16" />
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	if (error) {
		return (
			<Card>
				<CardContent className="p-6">
					<h3 className="text-lg font-semibold mb-4">Open Tickets (current)</h3>
					<div className="text-red-500 text-center">Failed to load ticket counts</div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card>
			<CardContent className="p-6">
				<h3 className="text-lg font-semibold mb-4">Open Tickets (current)</h3>
				<div className="flex justify-around">
					<div className="text-center">
						<div className="text-4xl font-bold text-green-600 mb-2">{counts.personal}</div>
						<div className="text-sm text-gray-500">YOU</div>
					</div>
					<div className="text-center">
						<div className="text-4xl font-bold text-blue-600 mb-2">{counts.group}</div>
						<div className="text-sm text-gray-500">GROUPS</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
} 