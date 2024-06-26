'use server'
import 'server-only'

import { submitReviewPayloadSchema, submitReviewSchema } from './validation'
import { createService } from '../service'
import { createServiceSupabaseClient, getSession } from '@/src/lib/supabase-server'
import { _base64ToArrayBuffer } from '@/src/lib/browser-crypto'

export const { handler, action } = createService(
    submitReviewSchema,
    async ({ payload, signature }) => {
      const supabaseService = createServiceSupabaseClient();
      const session = await getSession();

      if (!session || !session.user) {
        throw new Error("No user");
      }
      
      const { data: user } = await supabaseService.from("users").select("*, organization: organizations!public_users_organization_id_fkey (*) ").eq('id', session.user.id).single();
      if (!user) {
        throw new Error("User not found");
      }
      if (!user.organization) {
        return new Error("Organization not found");
      }
      console.log(user.organization)
      if (user.organization.privacy_type === 'anonymous') {
        if (!user.organization.public_key) {
          return new Error("Organization does not have a public key");
        }
        const publicKey = _base64ToArrayBuffer(user.organization.public_key);
        const publicKeyData = await crypto.subtle.importKey(
          "spki", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
          publicKey, //can be a publicKey or privateKey, as long as extractable was true
          {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
          },
          true,
          ["verify"],
        )
      
        const enc = new TextEncoder();
        const deSign = _base64ToArrayBuffer(signature);
  
        const isValid = await crypto.subtle.verify(
          "RSASSA-PKCS1-v1_5",
          publicKeyData,
          deSign,
          enc.encode(payload)
        );
  
        if (!isValid) {
          throw new Error("Invalid signature");
        }
  
        const payloadParse = submitReviewPayloadSchema.safeParse(JSON.parse(payload))
  
        if (!payloadParse.success) {
          throw new Error("Invalid payload");
        } 
  
        const payloadData = payloadParse.data;
  
        // Upsert the review
        const { data: review, error } = await supabaseService.from("reviews").upsert({
          ...payloadData,
          start_date: payloadData.start_date.toISOString(),
        }, {
          onConflict: 'organization_hash,tool_id',
        }).select('*').single();

        if (error) {
          throw error;
        }
  
        return review;  
      } else if (user.organization.privacy_type === 'public') {
        const payloadParse = submitReviewPayloadSchema.safeParse(JSON.parse(payload))
  
        if (!payloadParse.success) {
          throw new Error("Invalid payload");
        } 
  
        const payloadData = payloadParse.data;
  
        // Upsert the review
        const { data: review, error } = await supabaseService.from("reviews").upsert({
          ...payloadData,
          organization_id: user.organization.id,
          organization_hash: '',
          start_date: payloadData.start_date.toISOString(),
        }, {
          onConflict: 'organization_id,tool_id',
        }).select('*').single();

        if (error) {
          throw error;
        }

        console.log(review, error)
  
        return review;  
      } else {
        return new Error("Invalid privacy type");
      }
    }
)
