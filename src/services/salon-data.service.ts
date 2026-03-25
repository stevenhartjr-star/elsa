
import { Injectable } from '@angular/core';
import { StylistProfile, StylistFinancials, Appointment, ClientHistory } from '../models/analysis.model';

@Injectable({
  providedIn: 'root',
})
export class SalonDataService {
  
  // Static data extracted from the provided HTML
  private readonly staticStylists = [
    {
      id: "elsa-hart",
      name: "Elsa Hart",
      level: "3",
      title: "Master Stylist, Makeup Artist & Owner",
      imageUrl: "https://www.elsalons.com/wp-content/uploads/2025/09/794A9931-Edit-scaled.jpg",
      bio: "Elsa Hart graduated from Paul Mitchell The School of Rhode Island in 2013. She keeps up with the latest trends, education and continues to train her staff. Her main focus is to ensure all Elsalon’s clients are fully satisfied.",
      specialties: ["master stylist", "makeup", "owner", "trends"],
      instagramUrl: "https://www.instagram.com/elsahart_beauty/embed",
      bookingUrl: "https://elsalon.salontarget.com/"
    },
    {
      id: "liz-eblan",
      name: "Liz Eblan",
      level: "3",
      title: "Master Stylist & Manager",
      imageUrl: "https://www.elsalons.com/wp-content/uploads/2025/09/794A9827-Edit-1-scaled.jpg",
      bio: "Liz has been in the beauty industry for 25+ years. She specializes in color, haircutting, and chemical services. She loves creating to help people achieve the best versions of themselves.",
      specialties: ["color", "haircutting", "chemical services", "manager"],
      instagramUrl: "https://www.instagram.com/liz.prostylist/embed",
      bookingUrl: "https://elsalon.salontarget.com/"
    },
    {
      id: "mairead-pratt",
      name: "Mairead Pratt",
      level: "2",
      title: "Stylist & Makeup Artist",
      imageUrl: "https://www.elsalons.com/wp-content/uploads/2025/09/794A9633-Edit-scaled.jpg",
      bio: "Mairead graduated from Toni and Guy Hairdressing Academy in 2020. Throughout high school Mairead started her beauty career by doing freelance makeup, she then found her passion for hair and loves blonding.",
      specialties: ["blonding", "makeup", "toni & guy"],
      instagramUrl: "https://www.instagram.com/m.rose_beauty/embed",
      bookingUrl: "https://elsalon.salontarget.com/"
    },
    {
      id: "kellie-macfarland",
      name: "Kellie Macfarland",
      level: "1",
      title: "Level 1 Stylist",
      imageUrl: "https://www.elsalons.com/wp-content/uploads/2025/09/794A0228-Edit-scaled.jpg",
      bio: "Kellie graduated from Toni and Guy Braintree in 2023. She specializes in curly hair, vivid colors, and blonding. Her goal is to learn as much as she can and to make every client feel beautiful and special.",
      specialties: ["curly hair", "vivid colors", "blonding"],
      instagramUrl: "https://www.instagram.com/kelliecutz_/embed",
      bookingUrl: "https://elsalon.salontarget.com/"
    }
  ];

  getStylistBasics() {
      return this.staticStylists;
  }

  // Generate realistic-looking financial mocks based on level
  getMockFinancials(level: string): StylistFinancials {
      const lvl = parseInt(level, 10);
      const baseService = lvl === 3 ? 12000 : (lvl === 2 ? 8000 : 4500);
      const retailRate = lvl === 3 ? 0.22 : (lvl === 2 ? 0.15 : 0.10);
      const rebook = lvl === 3 ? 85 : (lvl === 2 ? 65 : 45);
      const ticket = lvl === 3 ? 185 : (lvl === 2 ? 140 : 95);

      const clients = Math.floor(baseService / ticket);

      return {
          serviceRevenue: baseService + Math.floor(Math.random() * 1000),
          retailRevenue: Math.floor((baseService * retailRate)),
          retailToServicePercent: Math.floor(retailRate * 100),
          rebookingRate: rebook,
          averageTicket: ticket,
          clientsPerMonth: clients,
          newClients: Math.floor(clients * (1 - (rebook / 100))) + (lvl === 1 ? 5 : 2), // Level 1s get more "new" clients
      };
  }

  getMockClientHistory(stylistName: string): ClientHistory[] {
    const clientNames = ["Emily R.", "Sarah P.", "Olivia W.", "Ava T.", "Sophia L.", "Mia K.", "Isabella C.", "Grace M.", "Lily J.", "Zoe B."];
    const history: ClientHistory[] = [];
    const today = new Date();
    
    // Use stylistName to seed the random generation for consistency
    const seed = stylistName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    clientNames.forEach((name, index) => {
        const lastVisit = new Date();
        // Use a seeded approach to make "at-risk" clients consistent for a given stylist
        const daysToSubtract = (seed % 50) + (index * 35) + 10;
        lastVisit.setDate(today.getDate() - daysToSubtract);
        history.push({
            name: name,
            lastVisitDate: lastVisit
        });
    });
    
    return history;
  }

  getMockAppointments(stylistName: string): Appointment[] {
    const seed = stylistName.length;
    const clientNames = ["Emily R.", "Sarah P.", "Olivia W.", "Ava T.", "Sophia L.", "Mia K.", "Isabella C.", "Grace M."];
    const services = [
        { name: "Balayage", duration: 180 },
        { name: "Full Highlights", duration: 150 },
        { name: "Haircut & Style", duration: 60 },
        { name: "Root Touch-Up", duration: 90 },
        { name: "Glaze & Blowout", duration: 60 },
    ];

    const appointments: Appointment[] = [];
    let currentTime = 9 * 60; // 9:00 AM in minutes
    const endTime = 17 * 60; // 5:00 PM in minutes
    let nameIndex = seed % clientNames.length;

    while (currentTime < endTime) {
        const shouldHaveAppointment = (Math.random() * seed) > 3;
        if (shouldHaveAppointment) {
            const service = services[Math.floor(Math.random() * services.length)];
            if (currentTime + service.duration <= endTime) {
                const hours = Math.floor(currentTime / 60);
                const minutes = currentTime % 60;
                appointments.push({
                    time: `${hours > 12 ? hours - 12 : hours}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`,
                    duration: service.duration,
                    clientName: clientNames[nameIndex],
                    service: service.name,
                    isCancelled: false
                });
                currentTime += service.duration;
                nameIndex = (nameIndex + 1) % clientNames.length;
            }
        }
        
        // Add a break
        currentTime += 30 + (Math.floor(Math.random() * 3) * 15); // 30, 45, or 60 min break
    }

    return appointments;
  }
}