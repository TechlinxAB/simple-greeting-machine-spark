
import { useQuery } from "@tanstack/react-query";
import { getFortnoxCredentials } from "@/integrations/fortnox/credentials";
import { useEffect } from "react";

export function FortnoxTokenInfo() {
  const { data: credentials, isLoading } = useQuery({
    queryKey: ["fortnox-credentials"],
    queryFn: getFortnoxCredentials,
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (credentials) {
      console.log("Token info available:", credentials.expiresAt ? new Date(credentials.expiresAt) : "No expiration");
    }
  }, [credentials]);

  // Return null to effectively remove the component when no credentials are present
  return null;
}
