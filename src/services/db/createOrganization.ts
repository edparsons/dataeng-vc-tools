'use server'
import 'server-only'

import { createOrganizationSchema } from './validation'
import { createService } from '../service'
import { createServiceSupabaseClient, getSession } from '@/src/lib/supabase-server'
import { Resend } from 'resend';
import { env } from '@/src/env'


export const { handler, action } = createService(
    createOrganizationSchema,
    async ({ domain }) => {
      const supabaseService = createServiceSupabaseClient();
      const session = await getSession();

      if (!session || !session.user) {
        throw new Error("No user");
      }
      
      const { data: org } = await supabaseService.from("organizations").select("*").eq('domain', domain).single();
      if (org) {
        return org;
      }
      const { data: newOrg} = await supabaseService.from("organizations").insert({ domain, status: 'pending'}).select("*").single();

      if (!newOrg) {
        throw new Error("Failed to create org");
      }

      const { data: updatedUser } = await supabaseService.from("users").update({ organization_id: newOrg.id }).eq("id", session.user.id);

      const resend = new Resend(env.RESEND_API_KEY);

      resend.emails.send({
        from: 'onboarding@dataeng.vc',
        to: 'ed@dataeng.vc',
        subject: `New Organization: ${domain}`,
        html: `<p>${session?.user.email} has asked to create a org for ${domain}</p>`
      });

      return newOrg;
    }
)
