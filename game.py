import random

def handle_move(Move, Mh, Uh):
    """
    Handle player combat move:
    A = Punch (1-40 damage)
    B = Kick (20-30 damage)
    C = Heal (+20-30 health)
    """
    if Move == "A":
        Mh = Mh - random.randint(1, 40)
    elif Move == "B":
        Mh = Mh - random.randint(20, 30)
    else:
        Uh = Uh + random.randint(20, 30)

    # Return the updated health values back to your main game
    return Mh, Uh

def move():
    Move = input("Enter your move, rookie (A: Punch, B: Kick, C: Heal): ").upper()
    while Move not in ["A", "B", "C"]:
        Move = input("Hey clown, don't you know the rules I mentioned? Pick a valid move (A, B, or C): ").upper()
    return Move

def main():
    print("Welcome back, you puny challenger!")
    Name = input("State your name, rookie: ").strip() or "Player"

    while True:
        try:
            # Try to get the input, convert it to a float, then to an int
            Age = int(float(input("Drop your age, lightweight: ")))
            break  # If it works, break out of the loop!
        except ValueError:
            print("Stop clowning around and drop a real number for your age, rookie!")

    print("\nRules & Moves:")
    print("A : Punch")
    print("B : Kick")
    print("C : Heal")
    print("Your Health: 100")
    print("Monster Health: 100\n")

    Uh = int(100)
    Mh = int(100)

    print("Monster: Hahaha! This tiny little ant thinks they can fight me? Hahaha, I will crush this pathetic lightweight with my pinky finger! Hahaha!\n")

    while Mh > 0 and Uh > 0:
        Move = move()
        Mh, Uh = handle_move(Move, Mh, Uh)
        if Uh >= 100:
            Uh = 100
        if Mh < 1:
            Mh = 0
            print(f"\nYour health: {Uh}")
            print(f"Monster's health: {Mh}")
            print("Monster: Argh! You actually pack a punch, you sneaky troublemaker!")
            print(f"Congratulations {Name}! You demolished the beast!")
            break
        else:
            print(f"\nYour health: {Uh}")
            print(f"Monster's health: {Mh}")

        print("\nMonster: Hahaha, somebody got moves! Take this!")
        Uh = Uh - random.randint(20, 40)
        if Uh < 1:
            Uh = 0
            print(f"Your health: {Uh}")
            print(f"Monster's health: {Mh}")
            print("Monster: Useless nobody! Drag your bruised, pathetic self out of my sight!")
            break
        else:
            print(f"Your health: {Uh}")
            print(f"Monster's health: {Mh}\n")

if __name__ == "__main__":
    main()
