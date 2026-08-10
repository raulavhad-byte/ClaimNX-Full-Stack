import React from 'react';
import { AuthMethod } from '../types';
import { Key, Shield, Lock, Fingerprint } from 'lucide-react';

interface AuthConfigProps {
  method: AuthMethod;
}

export const AuthConfig: React.FC<AuthConfigProps> = ({ method }) => {
  const getAuthDetails = () => {
    switch (method) {
      case 'MTLS':
        return {
          icon: <Fingerprint className="text-emerald-400" />,
          title: 'Mutual TLS (mTLS)',
          description: 'Requires client certificate authentication. Both server and client must present valid certificates signed by an approved CA.',
          steps: [
            'Upload Client Certificate (PEM)',
            'Configure Trusted Root CAs',
            'Set Certificate Expiry Alerts'
          ]
        };
      case 'OAUTH2':
        return {
          icon: <Shield className="text-blue-400" />,
          title: 'OAuth 2.0 (Client Credentials)',
          description: 'Standard enterprise authorization flow. Uses Client ID and Secret to obtain a Bearer Token.',
          steps: [
            'Configure Token Endpoint URL',
            'Define Required Scopes',
            'Set Client ID & Client Secret'
          ]
        };
      case 'API_KEY':
        return {
          icon: <Key className="text-amber-400" />,
          title: 'API Key Authentication',
          description: 'Simple header-based authentication using a static or rotating secret key.',
          steps: [
            'Generate Production API Key',
            'Set Header Name (e.g., X-API-Key)',
            'Configure IP Whitelisting'
          ]
        };
      case 'JWT':
        return {
          icon: <Lock className="text-purple-400" />,
          title: 'JSON Web Token (JWT)',
          description: 'Stateless authentication using signed tokens. Requires a shared secret or public/private key pair.',
          steps: [
            'Configure Signing Algorithm (RS256/HS256)',
            'Set JWKS Endpoint or Public Key',
            'Define Token TTL'
          ]
        };
    }
  };

  const details = getAuthDetails();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
          {details.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{details.title}</h3>
          <p className="text-sm text-zinc-500">{details.description}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Configuration Steps</h4>
        <div className="grid gap-3">
          {details.steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded border border-zinc-800/50">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-zinc-700">
                {idx + 1}
              </span>
              <span className="text-sm text-zinc-300">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-6 border-top border-zinc-800">
        <button className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-semibold rounded transition-colors flex items-center justify-center gap-2">
          Configure {details.title}
        </button>
      </div>
    </div>
  );
};
