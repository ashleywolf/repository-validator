import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LockSimple,
  LockOpen,
  Warning,
  Key,
  GithubLogo,
  Browsers,
} from "@phosphor-icons/react";
import { useAuth } from "../context/auth-context";

export const AuthExplainer: React.FC = () => {
  const { authState, login, initWithSparkAuth } = useAuth();
  const { isAuthenticated } = authState;

  const handleDirectAuth = async () => {
    if (typeof initWithSparkAuth === "function") {
      await initWithSparkAuth();
    } else if (typeof login === "function") {
      login();
    }
  };

  return (
    <div className="w-full">
      <Alert className="mb-4 bg-secondary/30 border-primary/20">
        <LockOpen className="h-4 w-4" />
        <AlertTitle>Authentication Options</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            Different repository types require different authentication methods.
          </p>
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="public-repos">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center">
              <Browsers className="mr-2 h-4 w-4" />
              <span>Public Repositories</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-3 text-sm">
              <p className="mb-2">
                <strong>Authentication:</strong> Optional
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Accessible without authentication</li>
                <li>
                  Authentication increases API rate limits from 60 to 5,000
                  requests per hour
                </li>
              </ul>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={handleDirectAuth}
                >
                  <GithubLogo className="mr-1 h-3 w-3" />
                  Sign in to increase rate limits
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="private-repos">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center">
              <LockSimple className="mr-2 h-4 w-4" />
              <span>Private Repositories</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-3 text-sm">
              <p className="mb-2">
                <strong>Authentication:</strong> Required
              </p>
              <p className="mb-2">
                <strong>Authentication methods:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  <strong>GitHub OAuth:</strong> Sign in with GitHub button (limited to repositories you own)
                </li>
                <li>
                  <strong>Personal Access Token (PAT):</strong> For repositories that require specific permissions
                </li>
              </ul>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={handleDirectAuth}
                >
                  <GithubLogo className="mr-1 h-3 w-3" />
                  Sign in with GitHub
                </Button>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="sso-repos">
          <AccordionTrigger className="text-sm">
            <div className="flex items-center">
              <Key className="mr-2 h-4 w-4" />
              <span>SSO/SAML Protected Repositories</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-3 text-sm">
              <p className="mb-2">
                <strong>Authentication:</strong> Special PAT required
              </p>
              <div className="bg-muted/50 p-2 rounded text-xs space-y-2">
                <p className="font-medium">How to access SSO/SAML repositories:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Create a{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      personal access token
                    </a>{" "}
                    with <code className="bg-secondary px-1 py-0.5 rounded">repo</code> scope
                  </li>
                  <li>
                    Enable SSO for your token (click "Configure SSO" next to the token)
                  </li>
                  <li>Authorize the token for your organization</li>
                  <li>Enter the token in the PAT field on the validation page</li>
                </ol>
              </div>
              <div className="mt-3 flex items-center text-xs">
                <Warning className="h-3 w-3 text-amber-500 mr-1" />
                <span>
                  Regular OAuth login won't work for SSO/SAML protected repositories
                </span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="mt-4 text-xs p-2 bg-muted/30 rounded border border-border">
        <p className="font-medium mb-1">Token Security:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Personal access tokens are stored only in your browser</li>
          <li>Tokens are not sent to our servers</li>
          <li>Clear your browser storage to remove stored tokens</li>
        </ul>
      </div>
    </div>
  );
};